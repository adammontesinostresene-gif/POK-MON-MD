/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  DEFAULT_INVENTORY,
  INITIAL_MISSIONS,
} from './data/pokemonData';
import { soundManager } from './utils/audio';
import { Award, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<ViewScreen>('TITLE');

  // Player state: starts with ONLY Pikachu in active team as requested!
  const [activeTeam, setActiveTeam] = useState<Pokemon[]>([createPikachuStarter()]);
  const [reserves, setReserves] = useState<Pokemon[]>(INITIAL_RESERVES);
  const [gold, setGold] = useState<number>(600);
  const [inventory, setInventory] = useState<Item[]>(DEFAULT_INVENTORY);
  const [missions, setMissions] = useState<RescueMission[]>(INITIAL_MISSIONS);

  // Active expedition
  const [currentDungeon, setCurrentDungeon] = useState<Dungeon | null>(null);
  const [completedDungeonInfo, setCompletedDungeonInfo] = useState<{
    name: string;
    goldEarned: number;
    team: Pokemon[];
  } | null>(null);

  // Handlers
  const handleStartFromTitle = () => {
    soundManager.startBgm('hub');
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
    setActiveTeam(updatedTeam);
    setReserves(updatedReserves);
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
    setActiveTeam(updatedTeam);
    setInventory(updatedInventory);
    setGold(finalGold);
    soundManager.startBgm('hub');
    setScreen('HUB');
  };

  return (
    <div
      className={`w-full bg-slate-950 font-sans text-slate-100 flex flex-col ${
        screen === 'DUNGEON_EXPLORE' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* 1. Title Screen */}
      {screen === 'TITLE' && <TitleScreen onStartGame={handleStartFromTitle} />}

      {/* 2. Hub Menu */}
      {screen === 'HUB' && (
        <HubMenu
          team={activeTeam}
          reserves={reserves}
          gold={gold}
          inventory={inventory}
          missions={missions}
          onSelectDungeon={handleSelectDungeon}
          onOpenTeamManager={() => setScreen('TEAM_MANAGEMENT')}
          onOpenEvolution={() => setScreen('EVOLUTION')}
          onUpdateInventory={(updated) => setInventory(updated)}
          onUpdateGold={(newGold) => setGold(newGold)}
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950/90 relative">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 shadow-lg">
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

            {/* Reward Summary */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 text-left text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Recompensa de Mazmorra:</span>
                <span className="font-mono font-bold text-amber-400">
                  +{completedDungeonInfo?.goldEarned} Pokécuartos
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Puntos de Rango de Rescate:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +120 Puntos
                </span>
              </div>
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
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950/90 relative">
          <div className="bg-slate-900 border-2 border-red-500 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center flex flex-col gap-5 shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center mx-auto text-red-400 shadow-lg">
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
