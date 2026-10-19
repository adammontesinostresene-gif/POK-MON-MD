/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
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
  normalizeItems,
  INITIAL_MISSIONS,
} from './data/pokemonData';
import { soundManager } from './utils/audio';
import { ABILITY_CAPSULE_NAME, withAbility } from './data/abilities';
import { clearSave, loadGame, saveGame } from './utils/saveGame';
import { Award, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

const restorePokemon = (p: Pokemon): Pokemon => {
  // Recomputing from official bases also migrates saves made with the old hand-tuned stats
  const stats = calculateStats(p.pokedexId, p.level) ?? p.stats;
  return withAbility({
    ...p,
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

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<ViewScreen>('TITLE');

  // Saved progress (localStorage), read once on startup
  const [initialSave] = useState(() => loadGame());
  const [hasSave, setHasSave] = useState<boolean>(initialSave !== null);
  const abandonedExpedition = initialSave?.inDungeon ?? false;
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
  const [missions, setMissions] = useState<RescueMission[]>(initialSave?.missions ?? INITIAL_MISSIONS);
  const [seenPokedex, setSeenPokedex] = useState<number[]>(initialSave?.seenPokedex ?? []);
  const [caughtPokedex, setCaughtPokedex] = useState<number[]>(initialSave?.caughtPokedex ?? []);

  const registerSeen = (ids: number[]) => setSeenPokedex((prev) => mergeDexIds(prev, ids));
  const registerCaught = (ids: number[]) => setCaughtPokedex((prev) => mergeDexIds(prev, ids));

  // Anyone who has been on the team counts as recruited (also migrates older saves)
  useEffect(() => {
    registerCaught([...activeTeam, ...reserves].map((p) => p.pokedexId));
  }, [activeTeam, reserves]);

  // Active expedition
  const [currentDungeon, setCurrentDungeon] = useState<Dungeon | null>(null);
  const [completedDungeonInfo, setCompletedDungeonInfo] = useState<{
    name: string;
    goldEarned: number;
    team: Pokemon[];
  } | null>(null);

  // Auto-save whenever progress changes (not on the title screen, so a save is never overwritten before choosing)
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
      seenPokedex,
      caughtPokedex,
      inDungeon: screen === 'DUNGEON_EXPLORE',
    });
    setHasSave(true);
  }, [screen, activeTeam, reserves, gold, bankGold, rankPoints, inventory, storage, missions, seenPokedex, caughtPokedex]);

  // Handlers
  const handleStartFromTitle = () => {
    soundManager.startBgm('hub');
    setScreen(activeTeam.length > 0 ? 'HUB' : 'PERSONALITY_QUIZ');
  };

  const handleNewGame = () => {
    clearSave();
    setActiveTeam([]);
    setReserves([]);
    setGold(0);
    setBankGold(0);
    setRankPoints(0);
    setInventory([]);
    setStorage([]);
    setMissions(INITIAL_MISSIONS);
    setSeenPokedex([]);
    setCaughtPokedex([]);
    setHasSave(false);
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
    setGold(finalGold);
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
    updatedInventory: Item[],
    finalGold: number
  ) => {
    setActiveTeam(updatedTeam.map(restorePokemon));
    setReserves((prev) => prev.map(restorePokemon));
    setInventory(normalizeItems(updatedInventory));
    setGold(finalGold);
    soundManager.startBgm('hub');
    setScreen('HUB');
  };

  return (
    <div className="w-full h-dvh overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* 1. Title Screen */}
      {screen === 'TITLE' && (
        <TitleScreen
          hasSave={hasSave}
          savedLeaderPokedexId={initialSave?.activeTeam[0]?.pokedexId}
          notice={
            abandonedExpedition
              ? 'Abandonaste una expedición a medias: perdiste el dinero y los objetos que llevabas encima.'
              : null
          }
          onStartGame={handleStartFromTitle}
          onNewGame={handleNewGame}
        />
      )}

      {/* 1b. Personality test that picks the starter */}
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
