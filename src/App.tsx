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
import {
  Pokemon,
  Dungeon,
  Item,
  RescueMission,
  ViewScreen,
} from './types/game';
import {
  createPikachuStarter,
  INITIAL_RESERVES,
  INITIAL_MISSIONS,
} from './data/pokemonData';
import { soundManager } from './utils/audio';
import { clearSave, loadGame, saveGame } from './utils/saveGame';
import { Award, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

const restorePokemon = (p: Pokemon): Pokemon => ({
  ...p,
  stats: { ...p.stats, hp: p.stats.maxHp },
  moves: p.moves.map((m) => ({ ...m, pp: m.maxPp })),
  status: 'none',
  statusTurns: 0,
});

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<ViewScreen>('TITLE');

  // Saved progress (localStorage), read once on startup
  const [initialSave] = useState(() => loadGame());
  const [hasSave, setHasSave] = useState<boolean>(initialSave !== null);
  const abandonedExpedition = initialSave?.inDungeon ?? false;

  // Player state: starts with ONLY Pikachu in active team as requested!
  const [activeTeam, setActiveTeam] = useState<Pokemon[]>(() =>
    initialSave ? initialSave.activeTeam.map(restorePokemon) : [createPikachuStarter()]
  );
  const [reserves, setReserves] = useState<Pokemon[]>(initialSave?.reserves ?? INITIAL_RESERVES);
  const [gold, setGold] = useState<number>(
    initialSave && !abandonedExpedition ? initialSave.gold : 0
  );
  const [bankGold, setBankGold] = useState<number>(initialSave?.bankGold ?? 0);
  const [inventory, setInventory] = useState<Item[]>(
    initialSave && !abandonedExpedition ? initialSave.inventory : []
  );
  const [storage, setStorage] = useState<Item[]>(initialSave?.storage ?? []);
  const [missions, setMissions] = useState<RescueMission[]>(initialSave?.missions ?? INITIAL_MISSIONS);

  // Active expedition
  const [currentDungeon, setCurrentDungeon] = useState<Dungeon | null>(null);
  const [completedDungeonInfo, setCompletedDungeonInfo] = useState<{
    name: string;
    goldEarned: number;
    team: Pokemon[];
  } | null>(null);

  // Auto-save whenever progress changes (not on the title screen, so a save is never overwritten before choosing)
  useEffect(() => {
    if (screen === 'TITLE') return;
    saveGame({
      version: 1,
      activeTeam,
      reserves,
      gold,
      bankGold,
      inventory,
      storage,
      missions,
      inDungeon: screen === 'DUNGEON_EXPLORE',
    });
    setHasSave(true);
  }, [screen, activeTeam, reserves, gold, bankGold, inventory, storage, missions]);

  // Handlers
  const handleStartFromTitle = () => {
    soundManager.startBgm('hub');
    setScreen('HUB');
  };

  const handleNewGame = () => {
    clearSave();
    setActiveTeam([createPikachuStarter()]);
    setReserves(INITIAL_RESERVES);
    setGold(0);
    setBankGold(0);
    setInventory([]);
    setStorage([]);
    setMissions(INITIAL_MISSIONS);
    setHasSave(false);
    handleStartFromTitle();
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
    setInventory(updatedInventory);
    setGold(finalGold);
    setCompletedDungeonInfo({
      name: currentDungeon?.name || 'Mazmorra',
      goldEarned: currentDungeon?.rewards.gold || 400,
      team: updatedTeam,
    });
    setScreen('VICTORY');
  };

  const handleDungeonExit = (
    updatedTeam: Pokemon[],
    updatedInventory: Item[],
    finalGold: number
  ) => {
    setActiveTeam(updatedTeam.map(restorePokemon));
    setReserves((prev) => prev.map(restorePokemon));
    setInventory(updatedInventory);
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
          notice={
            abandonedExpedition
              ? 'Abandonaste una expedición a medias: perdiste el dinero y los objetos que llevabas encima.'
              : null
          }
          onStartGame={handleStartFromTitle}
          onNewGame={handleNewGame}
        />
      )}

      {/* 2. Hub Menu */}
      {screen === 'HUB' && (
        <HubMenu
          team={activeTeam}
          reserves={reserves}
          gold={gold}
          bankGold={bankGold}
          inventory={inventory}
          storage={storage}
          missions={missions}
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

      {/* 4. Dungeon Exploration by Events & Turn-Based Combats */}
      {screen === 'DUNGEON_EXPLORE' && currentDungeon && (
        <DungeonView
          dungeon={currentDungeon}
          team={activeTeam}
          reserves={reserves}
          inventory={inventory}
          gold={gold}
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
