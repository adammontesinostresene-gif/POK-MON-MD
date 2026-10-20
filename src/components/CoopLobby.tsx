import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Backpack, Check, Coins, Compass, Crown, LogOut, Minus, Play, Plus, UserX, Users } from 'lucide-react';
import { Dungeon, Item, Pokemon, RescueMission } from '../types/game';
import { BAG_LIMIT, DUNGEONS, addItem, bagCount, normalizeItems } from '../data/pokemonData';
import { describeMission } from '../data/missionData';
import { createCoopGame } from '../data/coopEngine';
import {
  COOP_MAX_MEMBERS,
  CoopParty,
  createParty,
  deleteParty,
  fetchMyParties,
  joinParty,
  removeMember,
  setPartyDungeon,
  subscribeOpenParties,
  subscribeParty,
  updateContribution,
  updateLeader,
  writeGame,
} from '../utils/coop';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';

interface CoopLobbyProps {
  player: { uid: string; name: string };
  leader: Pokemon;
  inventory: Item[];
  gold: number;
  unlockedDungeons: Dungeon[];
  activeMission: RescueMission | null;
  onBack: () => void;
  onExpeditionStart: (party: CoopParty) => void;
}

const dungeonName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? 'Mazmorra';

const removeOne = (items: Item[], name: string): Item[] =>
  items.map((it) => (it.name === name ? { ...it, count: it.count - 1 } : it)).filter((it) => it.count > 0);

export const CoopLobby: React.FC<CoopLobbyProps> = ({
  player,
  leader,
  inventory,
  gold,
  unlockedDungeons,
  activeMission,
  onBack,
  onExpeditionStart,
}) => {
  const [partyId, setPartyId] = useState<string | null>(null);
  const [party, setParty] = useState<CoopParty | null>(null);
  const [openParties, setOpenParties] = useState<CoopParty[]>([]);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [goldInput, setGoldInput] = useState('0');
  // The snapshot listener outlives renders: always call the latest callback, and only once
  const onStartRef = useRef(onExpeditionStart);
  onStartRef.current = onExpeditionStart;
  const startedRef = useRef(false);

  // Rejoin a lobby left open (e.g. after reloading); expeditions in progress are abandoned
  useEffect(() => {
    let cancelled = false;
    fetchMyParties(player.uid)
      .then(async (parties) => {
        for (const p of parties) {
          if (p.status === 'lobby' && !cancelled) {
            setPartyId(p.id);
            await updateLeader(p.id, player.uid, leader).catch(() => undefined);
            return;
          }
          if (p.hostUid === player.uid) await deleteParty(p.id).catch(() => undefined);
          else await removeMember(p.id, player.uid).catch(() => undefined);
        }
      })
      .catch((err) => console.warn('No se pudieron consultar tus grupos', err))
      .finally(() => !cancelled && setCheckingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [player.uid]);

  useEffect(() => {
    if (!partyId) {
      setParty(null);
      return;
    }
    return subscribeParty(
      partyId,
      (p) => {
        if (!p) {
          setNotice('El grupo se ha disuelto.');
          setPartyId(null);
          return;
        }
        if (!p.memberUids.includes(player.uid)) {
          setNotice('Has salido del grupo.');
          setPartyId(null);
          return;
        }
        setParty(p);
        if (p.status === 'playing' && p.game && !startedRef.current) {
          startedRef.current = true;
          onStartRef.current(p);
        }
      },
      (err) => setNotice(`Error de conexión: ${err.message}`)
    );
  }, [partyId, player.uid]);

  useEffect(() => {
    if (partyId) return;
    return subscribeOpenParties(setOpenParties, (err) => setNotice(`Error de conexión: ${err.message}`));
  }, [partyId]);

  const me = party?.members[player.uid];
  const isHost = party?.hostUid === player.uid;
  const sharedBag = useMemo(
    () => normalizeItems(party ? party.memberUids.flatMap((uid) => party.members[uid]?.items ?? []) : []),
    [party]
  );
  const sharedGold = party ? party.memberUids.reduce((sum, uid) => sum + (party.members[uid]?.gold ?? 0), 0) : 0;
  const selectedDungeon = DUNGEONS.find((d) => d.id === party?.dungeonId);

  useEffect(() => {
    if (me) setGoldInput(String(me.gold));
  }, [me?.gold]);

  const run = async (action: () => Promise<void>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      console.warn(errorMessage, err);
      setNotice(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const defaultDungeon = () =>
    unlockedDungeons.find((d) => d.id === activeMission?.dungeonId) ?? unlockedDungeons[unlockedDungeons.length - 1];

  const handleCreate = () =>
    run(async () => {
      const dungeon = defaultDungeon();
      const id = await createParty(player.uid, player.name, leader, dungeon.id);
      await setPartyDungeon(id, dungeon.id, activeMission?.dungeonId === dungeon.id ? activeMission : null);
      soundManager.playSelect();
      setPartyId(id);
    }, 'No se pudo crear el grupo.');

  const handleJoin = (id: string) =>
    run(async () => {
      await joinParty(id, player.uid, player.name, leader);
      soundManager.playSelect();
      setPartyId(id);
    }, 'No se pudo entrar en el grupo (puede que esté lleno o ya haya salido).');

  const handleLeave = () =>
    run(async () => {
      if (!partyId) return;
      if (isHost) await deleteParty(partyId);
      else await removeMember(partyId, player.uid);
      setPartyId(null);
    }, 'No se pudo salir del grupo.');

  const saveContribution = (newGold: number, items: Item[]) => {
    if (!partyId) return;
    updateContribution(partyId, player.uid, newGold, items, false).catch(() =>
      setNotice('No se pudo actualizar tu aportación.')
    );
  };

  const contributeItem = (item: Item, delta: 1 | -1) => {
    if (!me) return;
    const mine = me.items.find((it) => it.name === item.name)?.count ?? 0;
    if (delta === 1) {
      if (mine >= item.count || bagCount(sharedBag) >= BAG_LIMIT) {
        soundManager.playHit();
        return;
      }
      saveContribution(me.gold, addItem(me.items, { ...item, count: 1 }));
    } else {
      if (mine <= 0) return;
      saveContribution(me.gold, removeOne(me.items, item.name));
    }
    soundManager.playSelect();
  };

  const commitGold = () => {
    if (!me) return;
    const value = Math.max(0, Math.min(gold, Math.floor(Number(goldInput) || 0)));
    setGoldInput(String(value));
    if (value !== me.gold) saveContribution(value, me.items);
  };

  const othersReady = party ? party.memberUids.filter((uid) => uid !== party.hostUid).every((uid) => party.members[uid]?.ready) : false;
  const canStart = Boolean(party && isHost && party.memberUids.length >= 2 && othersReady && selectedDungeon && bagCount(sharedBag) <= BAG_LIMIT);

  const handleStart = () =>
    run(async () => {
      if (!party || !partyId || !selectedDungeon || !canStart) return;
      await writeGame(partyId, createCoopGame(party, selectedDungeon), 'playing');
    }, 'No se pudo iniciar la expedición.');

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col p-2 sm:p-4 max-w-4xl mx-auto overflow-hidden">
      <header className="pmd-window shrink-0 flex items-center justify-between gap-2 bg-slate-900/90 rounded-xl p-2.5 sm:p-3 border border-slate-800 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">Expedición Multijugador</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              Hasta {COOP_MAX_MEMBERS} exploradores, cada uno con su líder
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            soundManager.playSelect();
            onBack();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Aldea</span>
        </button>
      </header>

      {notice && (
        <p className="shrink-0 mb-2 text-xs text-amber-200 bg-amber-950/60 border border-amber-600/50 rounded-lg px-3 py-2">{notice}</p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {checkingExisting ? (
          <p className="text-xs text-slate-400 text-center py-8">Buscando grupos...</p>
        ) : !party || !me ? (
          <>
            <button
              disabled={busy}
              onClick={handleCreate}
              className="pmd-window w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear un grupo (serás el líder)
            </button>

            <div className="pmd-window bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Grupos abiertos</h2>
              {openParties.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No hay grupos esperando. ¡Crea uno!</p>
              ) : (
                openParties.map((p) => {
                  const full = p.memberUids.length >= COOP_MAX_MEMBERS;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-800/70 rounded-lg p-2 border border-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-2 shrink-0">
                          {p.memberUids.map((uid) =>
                            p.members[uid] ? (
                              <PmdPortrait key={uid} pokedexId={p.members[uid].leader.pokedexId} size={28} showFrame={true} />
                            ) : null
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">Grupo de {p.hostName}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {dungeonName(p.dungeonId)} · {p.memberUids.length}/{COOP_MAX_MEMBERS}
                          </p>
                        </div>
                      </div>
                      <button
                        disabled={busy || full}
                        onClick={() => handleJoin(p.id)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold cursor-pointer shrink-0"
                      >
                        {full ? 'Lleno' : 'Unirse'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            {/* Members */}
            <div className="pmd-window bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Grupo de {party.hostName} ({party.memberUids.length}/{COOP_MAX_MEMBERS})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {party.memberUids.map((uid) => {
                  const m = party.members[uid];
                  if (!m) return null;
                  const memberIsHost = uid === party.hostUid;
                  return (
                    <div key={uid} className="relative flex flex-col items-center gap-1 bg-slate-800/70 rounded-lg p-2 border border-slate-700">
                      <PmdPortrait pokedexId={m.leader.pokedexId} size={44} showFrame={true} />
                      <span className="text-xs font-bold text-white truncate max-w-full flex items-center gap-1">
                        {memberIsHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        {m.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {m.leader.name} · Nv. {m.leader.level}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 rounded ${
                          memberIsHost || m.ready ? 'bg-emerald-900/70 text-emerald-300' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {memberIsHost ? 'Líder' : m.ready ? 'Listo' : 'Preparándose'}
                      </span>
                      {isHost && !memberIsHost && (
                        <button
                          title="Expulsar del grupo"
                          onClick={() => run(() => removeMember(party.id, uid), 'No se pudo expulsar al jugador.')}
                          className="absolute top-1 right-1 p-1 rounded bg-slate-900/80 hover:bg-red-900/70 text-slate-400 hover:text-red-300 cursor-pointer"
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dungeon */}
            <div className="pmd-window bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Mazmorra
              </h2>
              {isHost ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {unlockedDungeons.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        soundManager.playSelect();
                        run(
                          () => setPartyDungeon(party.id, d.id, activeMission?.dungeonId === d.id ? activeMission : null),
                          'No se pudo cambiar la mazmorra.'
                        );
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        party.dungeonId === d.id
                          ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50'
                          : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-amber-400 block">
                        {d.difficulty} · Nv. {d.recommendedLevel}+
                      </span>
                      <span className="text-xs font-bold text-white">{d.name}</span>
                      <span className="text-[10px] text-slate-400 block">{d.floorsCount} pisos</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-white">
                  {selectedDungeon?.name ?? '—'}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({selectedDungeon?.floorsCount} pisos · elige el líder del grupo)
                  </span>
                </p>
              )}
              <p className="text-[11px] text-slate-300">
                {party.mission
                  ? `Misión del líder: ${describeMission(party.mission).title} (piso ${party.mission.targetFloor}). Todos ganaréis los puntos de rango.`
                  : 'Sin misión: el líder puede aceptar una del tablón en esta mazmorra para que cuente.'}
              </p>
            </div>

            {/* Shared bag */}
            <div className="pmd-window bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Backpack className="w-3.5 h-3.5" /> Mochila común ({bagCount(sharedBag)}/{BAG_LIMIT}) ·{' '}
                <Coins className="w-3.5 h-3.5 text-amber-400" /> {sharedGold}
              </h2>
              {sharedBag.length === 0 ? (
                <p className="text-xs text-slate-500">Todavía nadie ha aportado objetos.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sharedBag.map((it) => (
                    <span key={it.name} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {it.icon} {it.name} <strong className="text-amber-300">x{it.count}</strong>
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300">
                  Tu aportación (sale de tu mochila al empezar; el botín se reparte al volver)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <input
                    type="number"
                    min={0}
                    max={gold}
                    value={goldInput}
                    onChange={(e) => setGoldInput(e.target.value)}
                    onBlur={commitGold}
                    onKeyDown={(e) => e.key === 'Enter' && commitGold()}
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 font-mono"
                  />
                  <span className="text-slate-400">de {gold} Pokécuartos</span>
                </div>
                {inventory.length === 0 ? (
                  <p className="text-xs text-slate-500">Tu mochila está vacía.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {inventory.map((it) => {
                      const mine = me.items.find((x) => x.name === it.name)?.count ?? 0;
                      return (
                        <div key={it.id} className="flex items-center justify-between gap-2 bg-slate-800/70 rounded-lg px-2 py-1 border border-slate-700">
                          <span className="text-xs truncate">
                            {it.icon} {it.name} <span className="text-slate-400">({it.count})</span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => contributeItem(it, -1)}
                              disabled={mine <= 0}
                              className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-mono text-xs text-amber-300">{mine}</span>
                            <button
                              onClick={() => contributeItem(it, 1)}
                              disabled={mine >= it.count || bagCount(sharedBag) >= BAG_LIMIT}
                              className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {party && me && (
        <footer className="pmd-window shrink-0 mt-2 flex items-center justify-between gap-2 bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
          <button
            disabled={busy}
            onClick={handleLeave}
            className="flex items-center gap-1 px-3 py-2 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isHost ? 'Disolver grupo' : 'Salir del grupo'}
          </button>
          {isHost ? (
            <button
              disabled={busy || !canStart}
              onClick={handleStart}
              title={!canStart ? 'Hacen falta al menos 2 exploradores y que todos estén listos' : undefined}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 rounded-lg text-xs sm:text-sm font-bold cursor-pointer"
            >
              <Play className="w-4 h-4 fill-amber-950" />
              Iniciar expedición
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                soundManager.playSelect();
                const value = Math.max(0, Math.min(gold, Math.floor(Number(goldInput) || 0)));
                setGoldInput(String(value));
                run(
                  () => updateContribution(party.id, player.uid, value, me.items, !me.ready),
                  'No se pudo cambiar tu estado.'
                );
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold cursor-pointer ${
                me.ready ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Check className="w-4 h-4" />
              {me.ready ? 'Ya no estoy listo' : '¡Estoy listo!'}
            </button>
          )}
        </footer>
      )}
    </div>
  );
};
