import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Apple,
  ArrowRight,
  Award,
  Backpack,
  Coins,
  Compass,
  Crown,
  Gift,
  HelpCircle,
  LogOut,
  ShieldAlert,
  Sparkles,
  UserX,
  Vote,
} from 'lucide-react';
import { Item, Pokemon, RescueMission } from '../types/game';
import { BAG_LIMIT, DUNGEONS, bagCount } from '../data/pokemonData';
import {
  ITEM_SKIP_CHOICE,
  applyCombatVictory,
  completeMissionEvent,
  drinkSpring,
  finishGame,
  nextFloor,
  openChest,
  pickFloorItem,
  resolveChoice,
  startCombat,
  tallyVotes,
  applyItemOutsideCombat,
} from '../data/coopEngine';
import {
  CoopChannel,
  CoopGame,
  CoopParty,
  CoopResult,
  deleteParty,
  removeMember,
  submitInput,
  subscribeParty,
  writeGame,
} from '../utils/coop';
import { soundManager } from '../utils/audio';
import { CoopCombatLink, TurnBasedCombat } from './TurnBasedCombat';
import { PmdPortrait } from './PmdSprite';

export interface CoopOutcome {
  result: CoopResult | 'left';
  // This player's leader as it came back (null = unchanged)
  leader: Pokemon | null;
  recruits: Pokemon[];
  gold: number;
  items: Item[];
  missionCompleted: boolean;
  mission: RescueMission | null;
  isHost: boolean;
  dungeonId: string;
}

interface CoopDungeonViewProps {
  initialParty: CoopParty;
  localUid: string;
  onSeePokemon: (pokedexIds: number[]) => void;
  onFinish: (outcome: CoopOutcome) => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const parseInput = <T,>(data: string | undefined): T | null => {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

const RESULT_TEXT: Record<CoopResult | 'left', { title: string; text: string; good: boolean }> = {
  cleared: { title: '¡Mazmorra despejada!', text: 'El grupo derrotó al jefe final. El botín se ha repartido entre todos.', good: true },
  returned: { title: '¡Misión cumplida!', text: 'El grupo volvió a la aldea con todo el botín.', good: true },
  escaped: { title: 'Huida con éxito', text: 'Usasteis una esfera para salir de la mazmorra conservando el botín.', good: true },
  defeat: { title: 'El grupo ha caído', text: 'Todos los líderes fueron debilitados. Se perdió la mochila común.', good: false },
  abandoned: { title: 'Expedición abandonada', text: 'El líder del grupo abandonó la expedición. Se perdió la mochila común.', good: false },
  left: { title: 'Has salido del grupo', text: 'Ya no formas parte de la expedición. Tu líder vuelve a la aldea.', good: false },
};

export const CoopDungeonView: React.FC<CoopDungeonViewProps> = ({ initialParty, localUid, onSeePokemon, onFinish }) => {
  const partyId = initialParty.id;
  const [party, setParty] = useState<CoopParty>(initialParty);
  const [removed, setRemoved] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [bagItem, setBagItem] = useState<Item | null>(null);
  const [bagTargetIdx, setBagTargetIdx] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(
    () =>
      subscribeParty(
        partyId,
        (p) => {
          if (!p || !p.memberUids.includes(localUid)) {
            setRemoved(true);
            return;
          }
          setConnectionError(null);
          setParty(p);
        },
        (err) => setConnectionError(err.message)
      ),
    [partyId, localUid]
  );

  useEffect(() => {
    soundManager.startBgm('dungeon');
    return () => soundManager.stopBgm();
  }, []);

  const game = party.game!;
  const isHost = party.hostUid === localUid;
  const dungeon = DUNGEONS.find((d) => d.id === game.dungeonId) ?? DUNGEONS[0];
  const activeUids = party.memberUids;
  const event = game.event;
  const slotOf = (uid: string) => game.owners.indexOf(uid);
  const leaderOf = (uid: string) => game.team[slotOf(uid)];

  // The host is the only writer of the game state; this keeps its latest version between snapshots
  const gameRef = useRef<CoopGame>(game);
  useEffect(() => {
    if (party.game && party.game.version >= gameRef.current.version) gameRef.current = party.game;
  }, [party.game]);

  const hostCommit = (update: (g: CoopGame) => CoopGame | null) => {
    if (!isHost) return;
    const next = update(gameRef.current);
    if (!next) return;
    next.version = gameRef.current.version + 1;
    gameRef.current = next;
    writeGame(partyId, next, next.result ? 'ended' : undefined).catch((err) =>
      setConnectionError(`No se pudo sincronizar: ${err.message}`)
    );
  };

  const send = (channel: CoopChannel, key: string, data: unknown) =>
    submitInput(partyId, localUid, channel, key, data).catch((err) =>
      setConnectionError(`No se pudo enviar: ${err.message}`)
    );

  useEffect(() => {
    const foes = event?.enemies ?? (event?.enemy ? [event.enemy] : []);
    if (foes.length > 0) onSeePokemon(foes.map((p) => p.pokedexId));
  }, [game.eventSeq]);

  useEffect(() => {
    if (!game.combat) soundManager.startBgm('dungeon');
  }, [Boolean(game.combat)]);

  // ---- Voting (decisions and "pick one of three" items) ----
  const voteKey = `v${game.eventSeq}`;
  const votingOpen =
    !game.result && !game.combat && !game.eventResolved && (event?.type === 'decision' || event?.type === 'item_choice');
  const choiceIds =
    event?.type === 'decision'
      ? (event.choices ?? []).map((c) => c.id)
      : [...(event?.itemChoices ?? []).map((it) => it.id), ITEM_SKIP_CHOICE];
  const votes: Record<string, string> = {};
  for (const uid of activeUids) {
    const input = party.inputs[uid]?.vote;
    const choice = input?.key === voteKey ? parseInput<string>(input.data) : null;
    if (choice && choiceIds.includes(choice)) votes[uid] = choice;
  }
  const missingVoters = activeUids.filter((uid) => !votes[uid]);

  useEffect(() => {
    if (!isHost || !votingOpen || missingVoters.length > 0 || !event) return;
    const winner = tallyVotes(choiceIds, Object.values(votes), votes[localUid]);
    const seq = game.eventSeq;
    hostCommit((g) => {
      if (g.eventSeq !== seq || g.eventResolved || g.combat) return null;
      if (event.type === 'decision') {
        const choice = event.choices?.find((c) => c.id === winner);
        if (!choice) return null;
        const next = resolveChoice(g, dungeon, choice, activeUids);
        if (next.message) next.message = `🗳️ «${choice.text}». ${next.message}`;
        return next;
      }
      return pickFloorItem(g, winner);
    });
  }, [party]);

  // ---- Bag requests from other members (outside battle) ----
  useEffect(() => {
    if (!isHost || game.result || game.combat) return;
    for (const uid of activeUids) {
      const input = party.inputs[uid]?.use;
      if (!input || gameRef.current.handledUses[uid] === input.key) continue;
      const req = parseInput<{ itemId: string; targetIdx: number; moveIdx?: number }>(input.data);
      hostCommit((g) => {
        const next = req
          ? applyItemOutsideCombat(g, req.itemId, req.targetIdx, req.moveIdx, g.names[uid] ?? 'Explorador', activeUids)
          : clone(g);
        next.handledUses = { ...next.handledUses, [uid]: input.key };
        return next;
      });
    }
  }, [party]);

  const applyBagItem = (item: Item, targetIdx: number, moveIdx?: number) => {
    soundManager.playSelect();
    setBagItem(null);
    setBagTargetIdx(null);
    setIsBagOpen(false);
    if (isHost) {
      hostCommit((g) => applyItemOutsideCombat(g, item.id, targetIdx, moveIdx, g.names[localUid] ?? 'Explorador', activeUids));
    } else {
      send('use', `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, { itemId: item.id, targetIdx, moveIdx });
    }
  };

  // ---- Battle (lockstep: every client replays the rounds the host commits) ----
  const combat = game.combat;
  const combatInit = useMemo(
    () =>
      combat
        ? {
            team: clone(game.team),
            enemies: clone(event?.enemies?.length ? event.enemies : event?.enemy ? [event.enemy] : []),
            inventory: clone(game.inventory),
          }
        : null,
    [combat?.id]
  );
  const [combatInventory, setCombatInventory] = useState<{ id: string; items: Item[] } | null>(null);
  const currentCombatInventory =
    combat && combatInventory?.id === combat.id ? combatInventory.items : combatInit?.inventory ?? [];
  const combatInventoryRef = useRef<Item[]>(currentCombatInventory);
  combatInventoryRef.current = currentCombatInventory;

  const combatLink: CoopCombatLink | null = combat
    ? {
        combatId: combat.id,
        seed: game.seed,
        localUid,
        isHost,
        owners: game.owners,
        activeUids,
        names: game.names,
        rounds: combat.rounds,
        decisions: combat.decisions,
        actionInputs: Object.fromEntries(game.owners.map((uid) => [uid, party.inputs[uid]?.combat])),
        decisionInputs: Object.fromEntries(game.owners.map((uid) => [uid, party.inputs[uid]?.decision])),
        submit: (channel, key, data) => send(channel, key, data),
        commitRound: (round, actions) =>
          hostCommit((g) =>
            g.combat?.id === combat.id && g.combat.rounds.length === round
              ? { ...g, combat: { ...g.combat, rounds: [...g.combat.rounds, actions] } }
              : null
          ),
        commitDecision: (key, value) =>
          hostCommit((g) =>
            g.combat?.id === combat.id && g.combat.decisions[key] === undefined
              ? { ...g, combat: { ...g.combat, decisions: { ...g.combat.decisions, [key]: value } } }
              : null
          ),
      }
    : null;

  // ---- Leaving / results ----
  const finish = (result: CoopResult | 'left') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const share = game.split?.[localUid];
    const stillMember = result !== 'left' && slotOf(localUid) !== -1;
    onFinish({
      result,
      leader: stillMember ? leaderOf(localUid) ?? null : null,
      recruits: game.recruits[localUid] ?? [],
      gold: share?.gold ?? 0,
      items: share?.items ?? [],
      missionCompleted: game.missionDone,
      mission: game.mission,
      isHost,
      dungeonId: game.dungeonId,
    });
    if (isHost && party.memberUids.length <= 1) deleteParty(partyId).catch(() => undefined);
    else if (!removed) removeMember(partyId, localUid).catch(() => undefined);
  };

  const handleLeave = () => {
    setConfirmLeave(false);
    soundManager.playSelect();
    if (isHost) {
      hostCommit((g) => finishGame(g, 'abandoned', activeUids));
      return;
    }
    finish('left');
  };

  // Result screen (also shown if this player was removed from the party)
  const result: CoopResult | 'left' | null = game.result ?? (removed ? 'left' : null);
  if (result) {
    const info = RESULT_TEXT[result];
    const share = game.split?.[localUid];
    const myRecruits = game.recruits[localUid] ?? [];
    return (
      <div className="h-full flex items-center justify-center p-3 sm:p-4 bg-slate-950/90">
        <div
          className={`pmd-window bg-slate-900 border-2 rounded-3xl max-w-md w-full max-h-full overflow-y-auto p-4 sm:p-6 text-center flex flex-col gap-3 shadow-2xl ${
            info.good ? 'pmd-gold border-amber-400' : 'pmd-danger border-red-500'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border-2 ${
              info.good ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-red-500/20 border-red-400 text-red-400'
            }`}
          >
            {info.good ? <Award className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{info.title}</h2>
            <p className="text-xs text-slate-300 mt-1">{info.text}</p>
            {game.message && result !== 'left' && <p className="text-xs text-slate-400 mt-1">{game.message}</p>}
          </div>
          {result !== 'left' && (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-xs text-left flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300">Tu parte del dinero:</span>
                <span className="font-mono font-bold text-amber-300">{share?.gold ?? 0} 🪙</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-300 shrink-0">Tus objetos:</span>
                <span className="text-right text-sky-300">
                  {share?.items.length ? share.items.map((it) => `${it.icon} ${it.name} x${it.count}`).join(', ') : 'Ninguno'}
                </span>
              </div>
              {game.missionDone && game.mission && (
                <div className="flex justify-between">
                  <span className="text-slate-300">Misión del líder:</span>
                  <span className="font-bold text-lime-300">+{game.mission.reward.rankPoints} pts. de rango</span>
                </div>
              )}
            </div>
          )}
          {myRecruits.length > 0 && (
            <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-2.5 text-xs text-emerald-200 flex flex-col gap-1.5">
              <span>Se unen a tu campamento:</span>
              <div className="flex justify-center gap-2">
                {myRecruits.map((p) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <PmdPortrait pokedexId={p.pokedexId} size={36} showFrame={true} />
                    <span className="text-[10px]">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => {
              soundManager.playSelect();
              finish(result);
            }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            Regresar a la Aldea
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const leaveModal = confirmLeave && (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="pmd-window pmd-danger bg-slate-900 border border-red-500/60 rounded-2xl max-w-md w-full p-5 flex flex-col gap-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          {isHost ? '¿Abandonar la expedición?' : '¿Salir del grupo?'}
        </h3>
        <p className="text-sm text-slate-300">
          {isHost
            ? 'Eres el líder del grupo: si abandonas, la expedición termina para todos y se pierde la mochila común.'
            : 'Si sales ahora, perderás tu parte del botín y el resto del grupo seguirá sin ti.'}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmLeave(false)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer"
          >
            Seguir explorando
          </button>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isHost ? 'Abandonar' : 'Salir'}
          </button>
        </div>
      </div>
    </div>
  );

  if (combat && combatInit && combatLink) {
    return (
      <div className="w-full h-full bg-slate-950 p-1 sm:p-2 md:p-3 flex flex-col items-center justify-center overflow-hidden box-border">
        <div className="w-full max-w-4xl flex items-center justify-between gap-2 mb-1 shrink-0">
          <span className="text-[11px] text-red-300 truncate">{connectionError}</span>
          <button
            onClick={() => {
              soundManager.playSelect();
              setConfirmLeave(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-red-800/80 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer shrink-0"
          >
            <LogOut className="w-3 h-3" />
            {isHost ? 'Abandonar' : 'Salir del grupo'}
          </button>
        </div>
        <div className="w-full max-w-4xl h-full max-h-full flex-1 flex flex-col min-h-0">
          <TurnBasedCombat
            key={combat.id}
            playerTeam={combatInit.team}
            enemies={combatInit.enemies}
            inventory={currentCombatInventory}
            bgImage={dungeon.bgImage}
            coop={combatLink}
            canUseEscapeOrb={event?.type !== 'boss'}
            onUpdateInventory={(items) => setCombatInventory({ id: combat.id, items })}
            onVictory={(team, _exp, goldGained, droppedItem, recruit, _toTeam, recruiterUid) =>
              hostCommit((g) =>
                g.combat?.id === combat.id
                  ? applyCombatVictory(g, dungeon, activeUids, team, combatInventoryRef.current, goldGained, droppedItem, recruit, recruiterUid)
                  : null
              )
            }
            onDefeat={() => hostCommit((g) => (g.combat?.id === combat.id ? finishGame(g, 'defeat', activeUids) : null))}
            onEscapeDungeon={(team, inventory) =>
              hostCommit((g) =>
                g.combat?.id === combat.id ? finishGame({ ...g, team, inventory }, 'escaped', activeUids) : null
              )
            }
          />
        </div>
        {leaveModal}
      </div>
    );
  }

  const hostName = game.names[party.hostUid] ?? party.hostName;
  const waitHost = <p className="text-xs text-slate-400 italic">Esperando a que {hostName} (líder del grupo) continúe...</p>;
  const isLastFloor = game.floor >= dungeon.floorsCount;

  const voterIcons = (choiceId: string) => (
    <div className="flex -space-x-1.5">
      {Object.entries(votes)
        .filter(([, c]) => c === choiceId)
        .map(([uid]) => {
          const leader = leaderOf(uid);
          return leader ? (
            <span key={uid} title={game.names[uid]}>
              <PmdPortrait pokedexId={leader.pokedexId} size={20} showFrame={true} />
            </span>
          ) : null;
        })}
    </div>
  );

  const myVote = votes[localUid];
  const castVote = (choiceId: string) => {
    soundManager.playSelect();
    send('vote', voteKey, choiceId);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col p-2 sm:p-3 md:p-4 short:p-1.5 max-w-5xl mx-auto overflow-hidden box-border">
      {/* HUD */}
      <div className="pmd-window bg-slate-900/90 rounded-xl p-2 sm:p-2.5 border border-slate-800 shadow-lg mb-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 shrink-0">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-white">{dungeon.name}</h1>
                <span className="font-pixel text-[9px] sm:text-[10px] px-1.5 rounded bg-sky-950 text-sky-400 border border-sky-500/40">
                  Piso {game.floor}/{dungeon.floorsCount}
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  Multijugador
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {isLastFloor
                  ? '¡GUARIDA DEL JEFE FINAL!'
                  : game.mission && !game.missionDone
                  ? `Misión: piso ${game.mission.targetFloor} · Salida: piso ${dungeon.floorsCount}`
                  : `Objetivo: alcanzar las escaleras del piso ${dungeon.floorsCount}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/80 text-xs">
              <Apple className={`w-3.5 h-3.5 ${game.belly < 25 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
              <span className={`font-mono font-bold text-[11px] sm:text-xs ${game.belly < 25 ? 'text-red-400' : 'text-slate-200'}`}>
                {game.belly}/100
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/80 text-xs text-amber-300 font-mono font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">{game.gold}</span>
            </div>
            <button
              onClick={() => {
                soundManager.playSelect();
                setIsBagOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <Backpack className="w-3.5 h-3.5" />
              <span>Mochila ({bagCount(game.inventory)})</span>
            </button>
            <button
              onClick={() => {
                soundManager.playSelect();
                setConfirmLeave(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isHost ? 'Abandonar' : 'Salir'}</span>
            </button>
          </div>
        </div>

        {/* Party strip: one leader per player */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 mt-1.5 border-t border-slate-800/80">
          {game.owners.map((uid, slot) => {
            const member = game.team[slot];
            if (!member) return null;
            const present = activeUids.includes(uid);
            return (
              <div
                key={uid}
                className={`relative flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border min-w-0 ${
                  uid === localUid ? 'border-sky-600/70' : 'border-slate-800/60'
                } ${present ? '' : 'opacity-50'}`}
              >
                <PmdPortrait pokedexId={member.pokedexId} size={24} showFrame={true} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[10px] gap-1">
                    <span className="font-bold text-white truncate flex items-center gap-0.5">
                      {uid === party.hostUid && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                      {game.names[uid]}
                    </span>
                    <span className="text-slate-400 font-mono text-[9px] shrink-0">Nv.{member.level}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full ${member.stats.hp / member.stats.maxHp < 0.25 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(member.stats.hp / member.stats.maxHp) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 truncate block">
                    {present ? member.name : `${member.name} · se fue`}
                  </span>
                </div>
                {isHost && present && uid !== localUid && (
                  <button
                    title="Expulsar del grupo"
                    onClick={() => setKickTarget(uid)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-slate-900/80 hover:bg-red-900/70 text-slate-500 hover:text-red-300 cursor-pointer"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {connectionError && <p className="text-[11px] text-red-300 mt-1">{connectionError}</p>}
      </div>

      {/* Floor event */}
      <div className="relative flex-1 min-h-0 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex flex-col justify-between">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${dungeon.bgImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

        <div className="relative z-10 px-2 sm:px-4 py-2 flex flex-col items-center justify-center text-center my-auto max-w-3xl mx-auto min-h-0 w-full overflow-y-auto">
          {event && (
            <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 w-full">
              {event.enemies && event.enemies.length > 1 ? (
                <div className="flex items-center -space-x-2.5 p-1 bg-slate-900/90 rounded-2xl border-2 border-red-500/70 shadow-xl">
                  {event.enemies.map((e, i) => (
                    <div key={e.id || i} className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden">
                      <PmdPortrait pokedexId={e.pokedexId} size={36} showFrame={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/90 border-2 border-sky-400/80 p-1 flex items-center justify-center">
                  {event.speakerPortrait ? (
                    <img
                      src={event.speakerPortrait}
                      alt={event.dialogueSpeaker || 'Evento'}
                      referrerPolicy="no-referrer"
                      style={{ imageRendering: 'pixelated' }}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : event.type === 'spring' ? (
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                  ) : event.type === 'chest' || event.type === 'item_choice' ? (
                    <Gift className="w-6 h-6 text-amber-400" />
                  ) : (
                    <HelpCircle className="w-6 h-6 text-amber-300" />
                  )}
                </div>
              )}

              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white">{event.title}</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-xl">{event.description}</p>
              </div>

              {!game.eventResolved && (
                <div className="w-full mt-1 flex flex-col gap-1.5">
                  {(event.type === 'combat' || event.type === 'boss' || event.type === 'monster_house') &&
                    (isHost ? (
                      <button
                        onClick={() => {
                          soundManager.playSelect();
                          const seq = game.eventSeq;
                          hostCommit((g) => (g.combat || g.eventSeq !== seq ? null : startCombat(g)));
                        }}
                        className="w-full max-w-md mx-auto py-2.5 px-5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        ¡Entrar en combate con todo el grupo!
                      </button>
                    ) : (
                      waitHost
                    ))}

                  {votingOpen && (
                    <>
                      <p className="text-[11px] text-sky-300 flex items-center justify-center gap-1">
                        <Vote className="w-3.5 h-3.5" />
                        Votación del grupo ({Object.keys(votes).length}/{activeUids.length})
                        {missingVoters.length > 0 && ` · faltan: ${missingVoters.map((uid) => game.names[uid]).join(', ')}`}
                      </p>
                      <div
                        className={`grid gap-1.5 sm:gap-2 w-full text-left ${
                          choiceIds.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : choiceIds.length >= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
                        }`}
                      >
                        {event.type === 'decision'
                          ? (event.choices ?? []).map((choice) => (
                              <button
                                key={choice.id}
                                onClick={() => castVote(choice.id)}
                                className={`p-2 sm:p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                                  myVote === choice.id
                                    ? 'bg-amber-950/70 border-amber-400 ring-1 ring-amber-400/60'
                                    : 'bg-slate-800/95 border-slate-700 hover:border-amber-400'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1 w-full">
                                  <span className="font-semibold text-xs text-white leading-tight">{choice.text}</span>
                                  {voterIcons(choice.id)}
                                </div>
                                {choice.hint && <span className="text-[10px] text-amber-300/85 font-mono">💡 {choice.hint}</span>}
                              </button>
                            ))
                          : [...(event.itemChoices ?? []), null].map((item) => {
                              const id = item?.id ?? ITEM_SKIP_CHOICE;
                              return (
                                <button
                                  key={id}
                                  onClick={() => castVote(id)}
                                  className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                    myVote === id
                                      ? 'bg-amber-950/70 border-amber-400 ring-1 ring-amber-400/60'
                                      : 'bg-slate-800/95 border-slate-700 hover:border-amber-400'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl">{item?.icon ?? '🚶'}</span>
                                    <span className="min-w-0">
                                      <span className="font-semibold text-xs text-white block">{item?.name ?? 'No coger ninguno'}</span>
                                      {item && <span className="text-[10px] text-slate-400 block leading-tight">{item.description}</span>}
                                    </span>
                                  </span>
                                  {voterIcons(id)}
                                </button>
                              );
                            })}
                      </div>
                      {event.type === 'item_choice' && bagCount(game.inventory) >= BAG_LIMIT && (
                        <p className="text-[11px] text-red-300">La mochila común está llena ({BAG_LIMIT}/{BAG_LIMIT}).</p>
                      )}
                    </>
                  )}

                  {event.type === 'spring' &&
                    (isHost ? (
                      <button
                        onClick={() => {
                          soundManager.playHeal();
                          hostCommit((g) => (g.eventResolved ? null : drinkSpring(g)));
                        }}
                        className="w-full max-w-md mx-auto py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Beber del manantial y descansar
                      </button>
                    ) : (
                      waitHost
                    ))}

                  {event.type === 'chest' &&
                    (isHost ? (
                      <button
                        onClick={() => {
                          soundManager.playVictory();
                          hostCommit((g) => (g.eventResolved ? null : openChest(g)));
                        }}
                        className="w-full max-w-md mx-auto py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Gift className="w-4 h-4" />
                        Abrir el cofre misterioso
                      </button>
                    ) : (
                      waitHost
                    ))}

                  {event.type === 'mission' && game.mission &&
                    (isHost ? (
                      <button
                        onClick={() => {
                          soundManager.playLevelUp();
                          hostCommit((g) => (g.eventResolved ? null : completeMissionEvent(g)));
                        }}
                        className="w-full max-w-md mx-auto py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        {game.mission.kind === 'rescue' ? `Rescatar a ${game.mission.targetName}` : `Recoger el ${game.mission.itemName}`}
                      </button>
                    ) : (
                      waitHost
                    ))}
                </div>
              )}

              {game.message && (
                <div className="mt-1.5 p-2 sm:p-2.5 rounded-xl bg-slate-800/95 border border-emerald-500/60 text-emerald-200 text-xs sm:text-sm max-w-xl flex items-center gap-2.5 text-left">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="flex-1">{game.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stairs */}
        <div className="pmd-window relative z-10 px-3 py-2 sm:py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400">
            {game.eventResolved ? (
              <span className="text-emerald-400 font-semibold">
                {isHost ? '¡Piso despejado! Puedes llevar al grupo a las escaleras.' : `¡Piso despejado! ${hostName} decide cuándo subir.`}
              </span>
            ) : (
              <span>Hay que resolver el evento para habilitar las escaleras.</span>
            )}
          </div>
          {isHost && (
            <div className="flex items-center gap-2 shrink-0">
              {game.missionDone && game.eventResolved && !isLastFloor && (
                <button
                  onClick={() => {
                    soundManager.playSelect();
                    hostCommit((g) => finishGame(g, 'returned', activeUids));
                  }}
                  className="py-1.5 sm:py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Volver a la aldea
                </button>
              )}
              <button
                disabled={!game.eventResolved}
                onClick={() => {
                  soundManager.playSelect();
                  const seq = game.eventSeq;
                  hostCommit((g) => (g.eventSeq !== seq || !g.eventResolved ? null : nextFloor(g, dungeon, activeUids)));
                }}
                className="py-1.5 sm:py-2 px-3 sm:px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isLastFloor ? '¡Completar mazmorra!' : `Subir al piso ${game.floor + 1}`}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shared bag */}
      {isBagOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-full p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Backpack className="w-4 h-4 text-amber-400" />
                Mochila común
                <span className="text-xs font-mono text-slate-400">({bagCount(game.inventory)}/{BAG_LIMIT})</span>
              </h3>
              <button
                onClick={() => {
                  setIsBagOpen(false);
                  setBagItem(null);
                  setBagTargetIdx(null);
                }}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            {bagItem && bagTargetIdx !== null && game.team[bagTargetIdx] ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">¿Qué movimiento de {game.team[bagTargetIdx].name} restauras?</span>
                {game.team[bagTargetIdx].moves.map((move, moveIdx) => (
                  <button
                    key={move.id}
                    disabled={move.pp >= move.maxPp}
                    onClick={() => applyBagItem(bagItem, bagTargetIdx, moveIdx)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-700 flex justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold text-white">{move.name}</span>
                    <span className="font-mono text-slate-300">PP {move.pp}/{move.maxPp}</span>
                  </button>
                ))}
                <button onClick={() => setBagTargetIdx(null)} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs cursor-pointer">
                  Volver
                </button>
              </div>
            ) : bagItem ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">¿Sobre qué líder usas {bagItem.name}?</span>
                {game.team.map((member, idx) => (
                  <button
                    key={member.id}
                    disabled={bagItem.effectType === 'heal_hp' && member.stats.hp <= 0}
                    onClick={() => {
                      if (bagItem.effectType === 'restore_pp') {
                        soundManager.playSelect();
                        setBagTargetIdx(idx);
                        return;
                      }
                      applyBagItem(bagItem, idx);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-700 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <PmdPortrait pokedexId={member.pokedexId} size={28} showFrame={true} />
                      <span>
                        <span className="font-bold text-xs text-white block">
                          {member.name} <span className="text-slate-400 font-normal">({game.names[game.owners[idx]]})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          PS: {member.stats.hp}/{member.stats.maxHp}
                        </span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">Aplicar</span>
                  </button>
                ))}
                <button onClick={() => setBagItem(null)} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs cursor-pointer">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
                {game.inventory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">La mochila común está vacía.</p>
                ) : (
                  game.inventory.map((item) => {
                    const usable = ['restore_belly', 'heal_hp', 'restore_pp', 'revive', 'escape'].includes(item.effectType);
                    return (
                      <button
                        key={item.id}
                        disabled={!usable}
                        title={usable ? undefined : 'Solo se puede usar en combate o en la aldea'}
                        onClick={() => {
                          soundManager.playSelect();
                          if (item.effectType === 'restore_belly' || item.effectType === 'escape') applyBagItem(item, 0);
                          else setBagItem(item);
                        }}
                        className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-xl flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-xl">{item.icon}</span>
                          <span>
                            <span className="font-bold text-xs text-white block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">{item.description}</span>
                          </span>
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">x{item.count}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      {leaveModal}

      {/* Kick confirmation */}
      {kickTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 flex flex-col gap-4">
            <p className="text-sm text-slate-200">
              ¿Expulsar a <strong>{game.names[kickTarget]}</strong>? Su líder seguirá luchando solo (con ataques básicos) y no recibirá botín.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setKickTarget(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={() => {
                  removeMember(partyId, kickTarget).catch((err) => setConnectionError(err.message));
                  setKickTarget(null);
                }}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Expulsar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
