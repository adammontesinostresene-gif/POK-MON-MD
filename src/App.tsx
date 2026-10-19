/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { HubMenu } from './components/HubMenu';
import { TeamManager } from './components/TeamManager';
import { EvolutionMenu } from './components/EvolutionMenu';
import { DungeonView } from './components/DungeonView';
import { PersonalityQuiz } from './components/PersonalityQuiz';
import {
  Pokemon,
  Dungeon,
  Item,
  RescueMission,
  ViewScreen,
} from './types/game';
import {
  createStarter,
  applyOfficialMoves,
  calculateStats,
  getExpToNextLevel,
  normalizeItems,
  addItem,
} from './data/pokemonData';
import { createRewardItem, describeMission, describeReward, isValidMission, topUpMissions } from './data/missionData';
import { isValidShopStock, rollShopStock } from './data/itemData';
import { soundManager } from './utils/audio';
import { ABILITY_CAPSULE_NAME, withAbility } from './data/abilities';
import { clearSave, loadGame, saveGame } from './utils/saveGame';
import { submitScore } from './utils/leaderboard';
import { Award, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

const restorePokemon = (p: Pokemon): Pokemon => {
  // Recomputing from official bases also migrates saves made with the old hand-tuned stats
  const stats = calculateStats(p.pokedexId, p.level) ?? p.stats;
  // Keeps old saves and template Pokémon on the current EXP curve
  const nextExp = getExpToNextLevel(p.level);
  return withAbility({
    ...p,
    nextExp,
    exp: Math.min(p.exp, nextExp - 1),
    stats: { ...stats, hp: stats.maxHp },
    moves: p.moves.map((m) => ({ ...m, pp: m.maxPp })),
    status: 'none',
    statusTurns: 0,
  });
};

const mergeDexIds = (prev: number[], ids: number[]): number[] => {
  const missing = [...new Set(ids)].filter((id) => !prev.includes(id));
  return missing.length > 0 ? [...prev, ...missing] : prev;
};

interface AppProps {
  // Signed-in player (null when Firebase is not configured)
  player: { uid: string; name: string } | null;
  onRename?: (name: string) => Promise<void>;
  onSignOut?: () => void;
}

export default function App({ player, onRename, onSignOut }: AppProps) {
  // Screen state
  const [screen, setScreen] = useState<ViewScreen>('TITLE');

  // Saved progress (localStorage), read once on startup
  const [initialSave] = useState(() => loadGame(player?.uid));
  const abandonedExpedition = initialSave?.inDungeon ?? false;
  const [startupNotice, setStartupNotice] = useState<string | null>(
    abandonedExpedition
      ? 'Abandonaste una expedición a medias: perdiste el dinero y los objetos que llevabas encima.'
      : null
  );
  const loadSaved = (p: Pokemon) =>
    restorePokemon(initialSave?.version === 1 ? applyOfficialMoves(p) : p);

  // New games start empty: the personality test picks the single starter
  const [activeTeam, setActiveTeam] = useState<Pokemon[]>(() =>
    initialSave ? initialSave.activeTeam.map(loadSaved) : []
  );
  const [reserves, setReserves] = useState<Pokemon[]>(() =>
    initialSave ? initialSave.reserves.map(loadSaved) : []
  );
  const [gold, setGold] = useState<number>(
    initialSave && !abandonedExpedition ? initialSave.gold : 0
  );
  const [bankGold, setBankGold] = useState<number>(initialSave?.bankGold ?? 0);
  const [rankPoints, setRankPoints] = useState<number>(initialSave?.rankPoints ?? 0);
  const [inventory, setInventory] = useState<Item[]>(
    initialSave && !abandonedExpedition ? normalizeItems(initialSave.inventory) : []
  );
  const [storage, setStorage] = useState<Item[]>(normalizeItems(initialSave?.storage ?? []));
  const [missions, setMissions] = useState<RescueMission[]>(() =>
    (initialSave?.missions ?? []).filter(isValidMission)
  );
  const [activeMissionId, setActiveMissionId] = useState<string | null>(() =>
    missions.some((m) => m.id === initialSave?.activeMissionId) ? initialSave!.activeMissionId! : null
  );
  const [missionReport, setMissionReport] = useState<string | null>(null);
  const [clearedDungeons, setClearedDungeons] = useState<string[]>(() => {
    const saved = initialSave?.clearedDungeons;
    if (Array.isArray(saved)) return saved.filter((id): id is string => typeof id === 'string');
    // Saves from before this was tracked: players who already used missions keep access
    return (initialSave?.rankPoints ?? 0) > 0 || initialSave?.activeMissionId ? ['legacy'] : [];
  });
  const missionsUnlocked = clearedDungeons.length > 0;
  const [shopStock, setShopStock] = useState<string[]>(() =>
    isValidShopStock(initialSave?.shopStock) ? initialSave!.shopStock! : rollShopStock()
  );
  // Set during an expedition; rewards are handed out on returning to the village
  const completedMissionRef = useRef<RescueMission | null>(null);
  const [seenPokedex, setSeenPokedex] = useState<number[]>(initialSave?.seenPokedex ?? []);
  const [caughtPokedex, setCaughtPokedex] = useState<number[]>(initialSave?.caughtPokedex ?? []);

  const registerSeen = (ids: number[]) => setSeenPokedex((prev) => mergeDexIds(prev, ids));
  const registerCaught = (ids: number[]) => setCaughtPokedex((prev) => mergeDexIds(prev, ids));

  // Anyone who has been on the team counts as recruited (also migrates older saves)
  useEffect(() => {
    registerCaught([...activeTeam, ...reserves].map((p) => p.pokedexId));
  }, [activeTeam, reserves]);

  // The board always offers 3 missions from Pokémon the player has seen
  useEffect(() => {
    const seenIds = [...new Set([...seenPokedex, ...caughtPokedex])];
    if (missions.length >= 3 || seenIds.length === 0) return;
    setMissions((prev) => topUpMissions(prev, seenIds));
  }, [missions, seenPokedex, caughtPokedex]);

  const activeMission = missions.find((m) => m.id === activeMissionId) ?? null;

  // Applies the reward of a mission completed in the last expedition; returns the gold to carry
  const settleCompletedMission = (carriedGold: number): number => {
    const mission = completedMissionRef.current;
    if (!mission) return carriedGold;
    completedMissionRef.current = null;
    setRankPoints((r) => r + mission.reward.rankPoints);
    const rewardItem = mission.reward.itemName ? createRewardItem(mission.reward.itemName) : null;
    if (rewardItem) setStorage((s) => addItem(s, rewardItem));
    setMissions((prev) => prev.filter((m) => m.id !== mission.id));
    setActiveMissionId(null);
    setMissionReport(
      `¡Misión cumplida: ${describeMission(mission).title}! ${mission.clientName} te entrega ${describeReward(mission)}.` +
        (rewardItem ? ' El objeto se ha guardado en el Almacén Kangaskhan.' : '')
    );
    return carriedGold + (mission.reward.gold ?? 0);
  };

  // Back in the village the board gets fresh requests (only an accepted, unfinished mission stays) and Kecleon restocks
  const refreshMissionBoard = () => {
    const completedId = completedMissionRef.current?.id;
    const keepId = activeMissionId && activeMissionId !== completedId ? activeMissionId : null;
    setMissions((prev) => prev.filter((m) => m.id === keepId));
    setShopStock(rollShopStock());
  };

  // Active expedition
  const [currentDungeon, setCurrentDungeon] = useState<Dungeon | null>(null);
  const [completedDungeonInfo, setCompletedDungeonInfo] = useState<{
    name: string;
    goldEarned: number;
    team: Pokemon[];
  } | null>(null);

  // Auto-save whenever progress changes (the starter quiz has nothing to save yet)
  useEffect(() => {
    if (screen === 'TITLE' || screen === 'PERSONALITY_QUIZ') return;
    saveGame({
      version: 2,
      activeTeam,
      reserves,
      gold,
      bankGold,
      rankPoints,
      inventory,
      storage,
      missions,
      activeMissionId,
      seenPokedex,
      caughtPokedex,
      clearedDungeons,
      shopStock,
      inDungeon: screen === 'DUNGEON_EXPLORE',
    }, player?.uid);
  }, [screen, activeTeam, reserves, gold, bankGold, rankPoints, inventory, storage, missions, activeMissionId, seenPokedex, caughtPokedex, clearedDungeons, shopStock]);

  // Publish the score to the online leaderboard
  const leaderPokedexId = activeTeam[0]?.pokedexId;
  const leaderLevel = activeTeam[0]?.level;
  useEffect(() => {
    if (!player || leaderPokedexId === undefined || leaderLevel === undefined) return;
    submitScore(player.uid, { name: player.name, rankPoints, leaderPokedexId, leaderLevel }).catch((err) =>
      console.warn('No se pudo actualizar el ranking', err)
    );
  }, [player?.uid, player?.name, rankPoints, leaderPokedexId, leaderLevel]);

  // Handlers
  // No title screen: players with a save go straight to the village, new ones to the starter quiz
  useEffect(() => {
    soundManager.startBgm('hub');
    setScreen(activeTeam.length > 0 ? 'HUB' : 'PERSONALITY_QUIZ');
  }, []);

  const handleNewGame = () => {
    clearSave(player?.uid);
    setActiveTeam([]);
    setReserves([]);
    setGold(0);
    setBankGold(0);
    setRankPoints(0);
    setInventory([]);
    setStorage([]);
    setMissions([]);
    setActiveMissionId(null);
    setMissionReport(null);
    completedMissionRef.current = null;
    setSeenPokedex([]);
    setCaughtPokedex([]);
    setClearedDungeons([]);
    setShopStock(rollShopStock());
    setStartupNotice(null);
    soundManager.startBgm('hub');
    setScreen('PERSONALITY_QUIZ');
  };

  const handleQuizComplete = (pokedexId: number) => {
    setActiveTeam([createStarter(pokedexId)]);
    setReserves([]);
    setScreen('HUB');
  };

  const handleSelectDungeon = (dungeon: Dungeon) => {
    setCurrentDungeon(dungeon);
    setScreen('DUNGEON_EXPLORE');
  };

  const handleDungeonComplete = (
    updatedTeam: Pokemon[],
    updatedReserves: Pokemon[],
    updatedInventory: Item[],
    finalGold: number
  ) => {
    setActiveTeam(updatedTeam.map(restorePokemon));
    setReserves(updatedReserves.map(restorePokemon));
    setInventory(normalizeItems(updatedInventory));
    refreshMissionBoard();
    setGold(settleCompletedMission(finalGold));
    if (currentDungeon) {
      setClearedDungeons((prev) => (prev.includes(currentDungeon.id) ? prev : [...prev, currentDungeon.id]));
    }
    setCompletedDungeonInfo({
      name: currentDungeon?.name || 'Mazmorra',
      goldEarned: currentDungeon?.rewards.gold || 400,
      team: updatedTeam,
    });
    setScreen('VICTORY');
  };

  // Spend from the bag first, then from Kangaskhan's storage
  const consumeItem = (itemName: string) => {
    const consumeFrom = (items: Item[]) => {
      const idx = items.findIndex((it) => it.name === itemName && it.count > 0);
      if (idx === -1) return null;
      return items
        .map((it, i) => (i === idx ? { ...it, count: it.count - 1 } : it))
        .filter((it) => it.count > 0);
    };
    const newInventory = consumeFrom(inventory);
    if (newInventory) {
      setInventory(newInventory);
      return;
    }
    const newStorage = consumeFrom(storage);
    if (newStorage) setStorage(newStorage);
  };

  const countItem = (itemName: string) =>
    [...inventory, ...storage].filter((it) => it.name === itemName).reduce((n, it) => n + it.count, 0);

  const handleDungeonExit = (
    updatedTeam: Pokemon[],
    updatedReserves: Pokemon[],
    updatedInventory: Item[],
    finalGold: number
  ) => {
    setActiveTeam(updatedTeam.map(restorePokemon));
    setReserves(updatedReserves.map(restorePokemon));
    setInventory(normalizeItems(updatedInventory));
    refreshMissionBoard();
    setGold(settleCompletedMission(finalGold));
    soundManager.startBgm('hub');
    setScreen('HUB');
  };

  return (
    <div className="w-full h-dvh overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* 1. Personality test that picks the starter */}
      {screen === 'PERSONALITY_QUIZ' && <PersonalityQuiz onComplete={handleQuizComplete} />}

      {/* 2. Hub Menu */}
      {screen === 'HUB' && (
        <HubMenu
          team={activeTeam}
          reserves={reserves}
          gold={gold}
          rankPoints={rankPoints}
          bankGold={bankGold}
          inventory={inventory}
          storage={storage}
          missions={missions}
          shopStock={shopStock}
          missionsUnlocked={missionsUnlocked}
          playerName={player?.name ?? null}
          playerUid={player?.uid ?? null}
          onSignOut={onSignOut}
          onRename={onRename}
          onNewGame={handleNewGame}
          notice={startupNotice}
          onDismissNotice={() => setStartupNotice(null)}
          activeMissionId={activeMissionId}
          missionReport={missionReport}
          onAcceptMission={(id) => setActiveMissionId(id)}
          onCancelMission={() => setActiveMissionId(null)}
          onDismissMissionReport={() => setMissionReport(null)}
          seenPokedex={seenPokedex}
          caughtPokedex={caughtPokedex}
          onSelectDungeon={handleSelectDungeon}
          onOpenTeamManager={() => setScreen('TEAM_MANAGEMENT')}
          onOpenEvolution={() => setScreen('EVOLUTION')}
          onUpdateInventory={(updated) => setInventory(updated)}
          onUpdateGold={(newGold) => setGold(newGold)}
          onUpdateBank={(newGold, newBank) => {
            setGold(newGold);
            setBankGold(newBank);
          }}
          onUpdateStorage={(newInventory, newStorage) => {
            setInventory(newInventory);
            setStorage(newStorage);
          }}
        />
      )}

      {/* 3. Drag and Drop Team Manager */}
      {screen === 'TEAM_MANAGEMENT' && (
        <TeamManager
          activeTeam={activeTeam}
          reserves={reserves}
          abilityCapsules={countItem(ABILITY_CAPSULE_NAME)}
          onConsumeItem={consumeItem}
          onUpdateTeam={(newActive, newReserves) => {
            setActiveTeam(newActive);
            setReserves(newReserves);
          }}
          onBack={() => {
            soundManager.startBgm('hub');
            setScreen('HUB');
          }}
        />
      )}

      {/* 4. Evolution Chamber / Manantial Luminoso */}
      {screen === 'EVOLUTION' && (
        <EvolutionMenu
          activeTeam={activeTeam}
          reserves={reserves}
          availableItems={[...inventory, ...storage].filter((it) => it.count > 0).map((it) => it.name)}
          onUpdateTeam={(newActive, newReserves) => {
            setActiveTeam(newActive);
            setReserves(newReserves);
          }}
          onConsumeItem={consumeItem}
          onBack={() => {
            soundManager.startBgm('hub');
            setScreen('HUB');
          }}
        />
      )}

      {/* 4. Dungeon Exploration by Events & Turn-Based Combats */}
      {screen === 'DUNGEON_EXPLORE' && currentDungeon && (
        <DungeonView
          dungeon={currentDungeon}
          team={activeTeam}
          reserves={reserves}
          inventory={inventory}
          gold={gold}
          mission={activeMission?.dungeonId === currentDungeon.id ? activeMission : null}
          onMissionComplete={(mission) => {
            completedMissionRef.current = mission;
          }}
          onSeePokemon={registerSeen}
          onRecruitPokemon={registerCaught}
          onCompleteDungeon={handleDungeonComplete}
          onExitDungeon={handleDungeonExit}
        />
      )}

      {/* 5. Dungeon Victory Modal Screen */}
      {screen === 'VICTORY' && (
        <div className="h-full flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 relative">
          <div className="pmd-window pmd-gold bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-md w-full max-h-full p-4 sm:p-8 short:p-4 text-center flex flex-col gap-3 sm:gap-5 short:gap-2 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="short:hidden w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 shadow-lg">
              <Award className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-widest">
                ¡Misión Cumplida!
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {completedDungeonInfo?.name} Despejada
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tu equipo demostró gran valentía y destreza estratégica superando cada evento y derrotando al jefe final.
              </p>
            </div>

            <button
              onClick={() => {
                soundManager.playSelect();
                soundManager.startBgm('hub');
                setScreen('HUB');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold rounded-xl text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <span>Regresar a la Aldea</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Game Over / Defeat Modal Screen */}
      {screen === 'GAME_OVER' && (
        <div className="h-full flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 relative">
          <div className="pmd-window pmd-danger bg-slate-900 border-2 border-red-500 rounded-3xl max-w-md w-full max-h-full p-4 sm:p-8 short:p-4 text-center flex flex-col gap-3 sm:gap-5 short:gap-2 shadow-2xl">
            <div className="short:hidden w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center mx-auto text-red-400 shadow-lg">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                El Equipo ha Caído
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Todos los integrantes del equipo fueron debilitados en la expedición. Un equipo de rescate aliado os ha traído de vuelta a la base.
              </p>
            </div>

            <button
              onClick={() => {
                soundManager.playSelect();
                soundManager.startBgm('hub');
                // Revive team members with partial HP
                setActiveTeam((prev) =>
                  prev.map((p) => ({
                    ...p,
                    stats: { ...p.stats, hp: Math.round(p.stats.maxHp * 0.5) },
                  }))
                );
                setScreen('HUB');
              }}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm border border-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Volver a la Aldea y Recuperarse</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
