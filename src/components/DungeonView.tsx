import React, { useState, useEffect } from 'react';
import { Dungeon, Pokemon, Item, FloorEvent, DecisionChoice } from '../types/game';
import { generateFloorEvent, getRandomRecruit } from '../data/eventData';
import { TurnBasedCombat } from './TurnBasedCombat';
import { PmdPortrait } from './PmdSprite';
import { soundManager } from '../utils/audio';
import {
  Apple,
  Heart,
  Coins,
  Backpack,
  Compass,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Award,
  ChevronRight,
  LogOut,
  Gift
} from 'lucide-react';

interface DungeonViewProps {
  dungeon: Dungeon;
  team: Pokemon[];
  reserves: Pokemon[];
  inventory: Item[];
  gold: number;
  onCompleteDungeon: (
    updatedTeam: Pokemon[],
    updatedReserves: Pokemon[],
    updatedInventory: Item[],
    finalGold: number
  ) => void;
  onExitDungeon: (
    updatedTeam: Pokemon[],
    updatedInventory: Item[],
    finalGold: number
  ) => void;
}

export const DungeonView: React.FC<DungeonViewProps> = ({
  dungeon,
  team: initialTeam,
  reserves: initialReserves,
  inventory: initialInventory,
  gold: initialGold,
  onCompleteDungeon,
  onExitDungeon,
}) => {
  // Expedition State
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [belly, setBelly] = useState<number>(100);
  const [team, setTeam] = useState<Pokemon[]>(initialTeam);
  const [reserves, setReserves] = useState<Pokemon[]>(initialReserves);
  const [inventory, setInventory] = useState<Item[]>(initialInventory);
  const [gold, setGold] = useState<number>(initialGold);

  // Active Floor Event
  const [currentEvent, setCurrentEvent] = useState<FloorEvent | null>(null);
  const [inCombat, setInCombat] = useState<boolean>(false);
  const [eventResolved, setEventResolved] = useState<boolean>(false);
  const [resolutionMessage, setResolutionMessage] = useState<string | null>(null);

  // In-Dungeon Bag Modal
  const [isBagOpen, setIsBagOpen] = useState<boolean>(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [selectedItemForUse, setSelectedItemForUse] = useState<Item | null>(null);

  // Initialize first floor
  useEffect(() => {
    soundManager.startBgm('dungeon');
    loadFloor(1);
    return () => {
      soundManager.stopBgm();
    };
  }, []);

  const loadFloor = (floorNum: number, teamForEvent: Pokemon[] = team) => {
    soundManager.startBgm('dungeon');
    const event = generateFloorEvent(dungeon, floorNum, teamForEvent);
    setCurrentEvent(event);
    setEventResolved(false);
    setResolutionMessage(null);
    setInCombat(false);

    // Consume 6 belly per floor
    setBelly((prev) => {
      const nextBelly = Math.max(0, prev - 6);
      if (nextBelly === 0) {
        // Starving: take 5 damage on leader
        setTeam((curTeam) => {
          const leader = { ...curTeam[0] };
          leader.stats.hp = Math.max(1, leader.stats.hp - 5);
          return [leader, ...curTeam.slice(1)];
        });
      }
      return nextBelly;
    });
  };

  // Resolving Decision Choices
  const handleMakeChoice = (choice: DecisionChoice) => {
    soundManager.playSelect();

    if (choice.actionKey === 'give_berry') {
      const berryIdx = inventory.findIndex((it) => it.id.includes('oran') && it.count > 0);
      if (berryIdx !== -1) {
        const updatedInv = [...inventory];
        updatedInv[berryIdx].count -= 1;
        setInventory(updatedInv.filter((it) => it.count > 0));

        // Recruit new friend!
        const newFriend = getRandomRecruit();
        setReserves((prev) => [...prev, newFriend]);
        soundManager.playLevelUp();
        setResolutionMessage(
          `¡Le diste una Baya Aranja! El ${newFriend.name} recuperó toda su energía y ¡ha decidido unirse a tu campamento de reclutas!`
        );
      } else {
        setResolutionMessage(
          `Revisaste tu mochila, pero no te quedaban Bayas Aranja. El Pokémon te agradeció la buena intención y se marchó con cautela.`
        );
      }
    } else if (choice.actionKey === 'explore_tunnel') {
      if (Math.random() < 0.65) {
        const loot = 120 + currentFloor * 30;
        setGold((g) => g + loot);
        soundManager.playDrop();
        setResolutionMessage(
          `¡Al final del túnel hallaste un alijo escondido con ${loot} Pokécuartos y piedras preciosas!`
        );
      } else {
        // Rock trap
        setTeam((prev) =>
          prev.map((p) => ({
            ...p,
            stats: { ...p.stats, hp: Math.max(1, p.stats.hp - 8) },
          }))
        );
        soundManager.playHit();
        setResolutionMessage(
          `¡Una trampa de rocas se activó! El equipo esquivó la mayor parte pero recibieron 8 puntos de daño.`
        );
      }
    } else if (choice.actionKey === 'force_lock') {
      // Elemental resonance reward
      const bonusGold = 180 + currentFloor * 25;
      setGold((g) => g + bonusGold);
      const reviverItem: Item = {
        id: `reviver_reward_${Date.now()}`,
        name: 'Semilla Revivir',
        category: 'seed',
        description: 'Semilla milagrosa que revive a un Pokémon caído.',
        count: 1,
        effectType: 'revive',
        effectValue: 100,
        icon: '🌰',
      };
      setInventory((inv) => [...inv, reviverItem]);
      soundManager.playLevelUp();
      setResolutionMessage(
        `¡Las runas brillaron con chispas de alto voltaje abriendo una cámara secreta! Encontraste ${bonusGold} Pokécuartos y una valiosa Semilla Revivir.`
      );
    } else if (choice.actionKey === 'rest_carefully') {
      setBelly((b) => Math.min(100, b + 25));
      soundManager.playHeal();
      setResolutionMessage(
        `Recolectaste deliciosas bayas y descansaste un momento. ¡Recuperas +25 de Hambre!`
      );
    } else if (choice.actionKey === 'buy_item') {
      if (choice.id.includes('oran')) {
        if (gold >= 80) {
          setGold((g) => g - 80);
          const oran: Item = {
            id: `oran_shop_${Date.now()}`,
            name: 'Baya Aranja',
            category: 'healing',
            description: 'Restaura 50 PS a un Pokémon.',
            count: 1,
            effectType: 'heal_hp',
            effectValue: 50,
            icon: '🍎',
          };
          setInventory((inv) => [...inv, oran]);
          soundManager.playDrop();
          setResolutionMessage(
            `Kecleon te estrechó la mano amablemente: "¡Gracias por tu compra de Baya Aranja!"`
          );
        } else {
          setResolutionMessage(`Kecleon sonrió apenado: "No tienes suficientes Pokécuartos..."`);
        }
      } else {
        if (gold >= 220) {
          setGold((g) => g - 220);
          const reviver: Item = {
            id: `reviver_shop_${Date.now()}`,
            name: 'Semilla Revivir',
            category: 'seed',
            description: 'Revive inmediatamente a un Pokémon caído.',
            count: 1,
            effectType: 'revive',
            effectValue: 100,
            icon: '🌰',
          };
          setInventory((inv) => [...inv, reviver]);
          soundManager.playDrop();
          setResolutionMessage(
            `Kecleon hizo una reverencia: "¡Una Semilla Revivir de la mejor cosecha para tu equipo!"`
          );
        } else {
          setResolutionMessage(`Kecleon sonrió apenado: "Te faltan monedas para ese objeto..."`);
        }
      }
    } else {
      setResolutionMessage(`Avanzaste con sigilo y prudencia hacia las escaleras sin contratiempos.`);
    }

    setEventResolved(true);
  };

  // Rest Spring trigger
  const handleDrinkSpring = () => {
    soundManager.playHeal();
    setTeam((prev) =>
      prev.map((p) => ({
        ...p,
        stats: { ...p.stats, hp: p.stats.maxHp },
        moves: p.moves.map((m) => ({ ...m, pp: m.maxPp })),
      }))
    );
    setBelly((b) => Math.min(100, b + 40));
    setResolutionMessage(
      `¡Las aguas termales han sanado todas las heridas y restaurado el 100% de los PP de todos tus ataques!`
    );
    setEventResolved(true);
  };

  // Open Chest trigger
  const handleOpenChest = () => {
    soundManager.playVictory();
    const bounty = 160 + currentFloor * 45;
    setGold((g) => g + bounty);
    setResolutionMessage(
      `¡Abriste el cofre y contenía ${bounty} Pokécuartos y provisiones de exploración!`
    );
    setEventResolved(true);
  };

  // Victory in combat handler
  const handleCombatVictory = (
    updatedTeam: Pokemon[],
    expGained: number,
    goldGained: number,
    droppedItem?: Item,
    recruitedPokemon?: Pokemon,
    addToActiveTeam?: boolean
  ) => {
    let finalTeam = [...updatedTeam];
    let finalReserves = [...reserves];

    if (recruitedPokemon) {
      if (addToActiveTeam && finalTeam.length < 4) {
        finalTeam.push(recruitedPokemon);
        soundManager.playLevelUp();
      } else {
        finalReserves.push(recruitedPokemon);
      }
    }

    setTeam(finalTeam);
    setReserves(finalReserves);
    const finalGold = gold + goldGained;
    const finalInventory = droppedItem ? [...inventory, droppedItem] : inventory;
    setGold(finalGold);
    setInventory(finalInventory);

    // Winning a fight takes the team straight to the stairs
    if (currentFloor >= dungeon.floorsCount) {
      soundManager.playVictory();
      onCompleteDungeon(finalTeam, finalReserves, finalInventory, finalGold);
      return;
    }

    loadFloor(currentFloor + 1, finalTeam);
    setCurrentFloor((f) => f + 1);
  };

  // Next Floor Progression
  const handleNextFloor = () => {
    soundManager.playSelect();
    if (currentFloor >= dungeon.floorsCount) {
      // Dungeon completed!
      soundManager.playVictory();
      onCompleteDungeon(team, reserves, inventory, gold);
    } else {
      loadFloor(currentFloor + 1);
      setCurrentFloor((f) => f + 1);
    }
  };

  // Use Item from Bag
  const handleUseItemOnTarget = (item: Item, targetPokemonIndex: number) => {
    soundManager.playSelect();
    const updatedInv = inventory
      .map((it) => (it.id === item.id ? { ...it, count: it.count - 1 } : it))
      .filter((it) => it.count > 0);
    setInventory(updatedInv);

    if (item.effectType === 'escape') {
      setIsBagOpen(false);
      onExitDungeon(team, updatedInv, gold);
      return;
    }

    if (item.effectType === 'restore_belly') {
      soundManager.playHeal();
      setBelly((b) => Math.min(100, b + item.effectValue));
    } else if (item.effectType === 'heal_hp') {
      soundManager.playHeal();
      setTeam((prev) => {
        const next = [...prev];
        const target = { ...next[targetPokemonIndex] };
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + item.effectValue);
        next[targetPokemonIndex] = target;
        return next;
      });
    } else if (item.effectType === 'restore_pp') {
      soundManager.playHeal();
      setTeam((prev) => {
        const next = [...prev];
        const target = { ...next[targetPokemonIndex] };
        target.moves = target.moves.map((m) => ({ ...m, pp: m.maxPp }));
        next[targetPokemonIndex] = target;
        return next;
      });
    }

    setSelectedItemForUse(null);
  };

  // If in combat, render TurnBasedCombat view
  if (inCombat && (currentEvent?.enemies?.length || currentEvent?.enemy)) {
    return (
      <div className="w-full h-full bg-slate-950 p-1 sm:p-2 md:p-3 flex flex-col items-center justify-center overflow-hidden box-border">
        <div className="w-full max-w-4xl h-full max-h-full flex-1 flex flex-col min-h-0">
          <TurnBasedCombat
            playerTeam={team}
            enemy={currentEvent.enemy}
            enemies={currentEvent.enemies}
            inventory={inventory}
            bgImage={dungeon.bgImage}
            onVictory={handleCombatVictory}
            onDefeat={() => onExitDungeon(team, [], 0)}
            onEscapeDungeon={(combatTeam, remainingInventory) =>
              onExitDungeon(combatTeam, remainingInventory, gold)
            }
            canFlee={currentEvent.type !== 'boss'}
            onFlee={() => {
              setInCombat(false);
              setEventResolved(true);
              setResolutionMessage('¡Lograste huir del combate utilizando una maniobra evasiva!');
              soundManager.startBgm('dungeon');
            }}
            onUpdateInventory={(updated) => setInventory(updated)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col p-2 sm:p-3 md:p-4 short:p-1.5 max-w-5xl mx-auto overflow-hidden box-border">
      {/* Top Exploration HUD Bar */}
      <div className="pmd-window bg-slate-900/90 rounded-xl p-2 sm:p-2.5 border border-slate-800 shadow-lg mb-2 backdrop-blur-md shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Dungeon Name & Floor Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 shrink-0">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-white">
                  {dungeon.name}
                </h1>
                <span className="font-pixel text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-500/40">
                  Piso {currentFloor}/{dungeon.floorsCount}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {currentFloor >= dungeon.floorsCount
                  ? '¡GUARIDA DEL JEFE FINAL!'
                  : `Objetivo: Alcanzar las escaleras del piso ${dungeon.floorsCount}`}
              </p>
            </div>
          </div>

          {/* Vitals: Belly, Gold, Bag & Exit buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Belly / Hambre */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/80 text-xs">
              <Apple
                className={`w-3.5 h-3.5 ${
                  belly < 25 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              />
              <span className="text-slate-400 hidden sm:inline text-[10px]">Tripa:</span>
              <span
                className={`font-mono font-bold tabular-nums text-[11px] sm:text-xs ${
                  belly < 25 ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {belly}/100
              </span>
            </div>

            {/* Gold */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/80 text-xs text-amber-300 font-mono font-bold">
              <Coins className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">{gold}</span>
            </div>

            {/* Bag Button */}
            <button
              onClick={() => {
                soundManager.playSelect();
                setIsBagOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow cursor-pointer"
            >
              <Backpack className="w-3.5 h-3.5" />
              <span>Mochila ({inventory.reduce((a, b) => a + b.count, 0)})</span>
            </button>

            {/* Retreat / Escape */}
            <button
              onClick={() => {
                soundManager.playSelect();
                setIsExitConfirmOpen(true);
              }}
              title="Salir de la Mazmorra"
              className="flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Aldea</span>
            </button>
          </div>
        </div>

        {/* Active Party HP Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 mt-1.5 border-t border-slate-800/80">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60 min-w-0"
            >
              <PmdPortrait pokedexId={member.pokedexId} size={24} showFrame={true} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-white truncate max-w-[65px]">{member.name}</span>
                  <span className="text-slate-400 font-mono text-[9px]">Nv.{member.level}</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                  <div
                    className={`h-full transition-all ${
                      member.stats.hp / member.stats.maxHp < 0.25
                        ? 'bg-red-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${(member.stats.hp / member.stats.maxHp) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Floor Event Chamber */}
      <div className="relative flex-1 min-h-0 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex flex-col justify-between">
        {/* Dungeon Theme Background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-500 opacity-30"
          style={{ backgroundImage: `url(${dungeon.bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

        {/* Center Event Content */}
        <div className="relative z-10 px-2 sm:px-4 py-2 flex flex-col items-center justify-center text-center my-auto max-w-3xl mx-auto min-h-0 w-full">
          {currentEvent && (
            <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 animate-in fade-in zoom-in duration-300 w-full">
              {/* Event Badge / Icon */}
              {currentEvent.enemies && currentEvent.enemies.length > 1 ? (
                <div className="flex items-center -space-x-2.5 p-1 bg-slate-900/90 rounded-2xl border-2 border-red-500/70 shadow-xl shrink-0">
                  {currentEvent.enemies.map((enemyMember, i) => (
                    <div
                      key={enemyMember.id || i}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shadow"
                    >
                      <PmdPortrait pokedexId={enemyMember.pokedexId} size={36} showFrame={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/90 border-2 border-sky-400/80 p-1 flex items-center justify-center shadow-lg relative shrink-0">
                  {currentEvent.speakerPortrait ? (
                    <img
                      src={currentEvent.speakerPortrait}
                      alt={currentEvent.dialogueSpeaker || 'Enemigo'}
                      referrerPolicy="no-referrer"
                      style={{ imageRendering: 'pixelated' }}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  ) : currentEvent.type === 'spring' ? (
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 animate-pulse" />
                  ) : currentEvent.type === 'chest' ? (
                    <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-bounce" />
                  ) : currentEvent.type === 'decision' ? (
                    <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-red-400 animate-pulse" />
                  )}
                </div>
              )}

              {/* Title & Narrative Description */}
              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight">
                  {currentEvent.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-snug max-w-xl">
                  {currentEvent.description}
                </p>
              </div>

              {/* Event Actions & Choices (If not resolved yet) */}
              {!eventResolved && (
                <div className="w-full mt-1 sm:mt-1.5 flex flex-col gap-1.5">
                  {/* Combat Encounter Action */}
                  {(currentEvent.type === 'combat' ||
                    currentEvent.type === 'boss' ||
                    currentEvent.type === 'monster_house') && (
                    <button
                      onClick={() => {
                        soundManager.playSelect();
                        setInCombat(true);
                      }}
                      className="w-full max-w-md mx-auto py-2.5 px-5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      {currentEvent.enemies && currentEvent.enemies.length > 1
                        ? `¡Entrar en Combate contra ${currentEvent.enemies.length} Enemigos!`
                        : '¡Entrar en Combate por Turnos!'}
                    </button>
                  )}

                  {/* Decision Options in a responsive multi-column grid without vertical scrolling */}
                  {currentEvent.type === 'decision' && currentEvent.choices && (
                    <div
                      className={`grid gap-1.5 sm:gap-2 w-full text-left mt-0.5 ${
                        currentEvent.choices.length === 2
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-1 sm:grid-cols-3'
                      }`}
                    >
                      {currentEvent.choices.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleMakeChoice(choice)}
                          className="p-2 sm:p-2.5 bg-slate-800/95 hover:bg-slate-750 border border-slate-700 hover:border-amber-400 rounded-xl transition-all flex flex-col justify-between group shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-98"
                        >
                          <div className="flex items-start justify-between gap-1 w-full">
                            <span className="font-semibold text-xs text-white group-hover:text-amber-300 transition-colors leading-tight">
                              {choice.text}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
                          </div>
                          {choice.hint && (
                            <span className="text-[10px] text-amber-300/85 block mt-1 font-mono leading-tight bg-slate-900/70 px-1.5 py-0.5 rounded border border-slate-750/70">
                              💡 {choice.hint}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Spring Event Action */}
                  {currentEvent.type === 'spring' && (
                    <button
                      onClick={handleDrinkSpring}
                      className="w-full max-w-md mx-auto py-2.5 px-5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Beber del Manantial y Descansar
                    </button>
                  )}

                  {/* Chest Event Action */}
                  {currentEvent.type === 'chest' && (
                    <button
                      onClick={handleOpenChest}
                      className="w-full max-w-md mx-auto py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Gift className="w-4 h-4" />
                      Abrir el Cofre Misterioso
                    </button>
                  )}
                </div>
              )}

              {/* Outcome Feedback Message */}
              {resolutionMessage && (
                <div className="mt-1.5 p-2 sm:p-2.5 rounded-xl bg-slate-800/95 border border-emerald-500/60 text-emerald-200 text-xs sm:text-sm max-w-xl leading-relaxed shadow-lg animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2.5 text-left">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="flex-1">{resolutionMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Progression Bar: Stairs to Next Floor */}
        <div className="pmd-window relative z-10 px-3 py-2 sm:py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400">
            {eventResolved ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ¡El piso está despejado! Puedes avanzar a las escaleras.
              </span>
            ) : (
              <span>Resuelve el evento para habilitar las escaleras.</span>
            )}
          </div>

          <button
            disabled={!eventResolved}
            onClick={handleNextFloor}
            className="py-1.5 sm:py-2 px-3 sm:px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs sm:text-sm shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>
              {currentFloor >= dungeon.floorsCount
                ? '¡Completar Mazmorra!'
                : `Subir al Piso ${currentFloor + 1}`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* IN-DUNGEON BAG MODAL */}
      {isBagOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-full p-4 sm:p-5 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Backpack className="w-4 h-4 text-amber-400" />
                Mochila de Expedición
              </h3>
              <button
                onClick={() => {
                  setIsBagOpen(false);
                  setSelectedItemForUse(null);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            {selectedItemForUse ? (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-white text-sm block">
                    ¿Sobre qué Pokémon deseas usar {selectedItemForUse.name}?
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {selectedItemForUse.description}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {team.map((member, idx) => (
                    <button
                      key={member.id}
                      onClick={() => handleUseItemOnTarget(selectedItemForUse, idx)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <PmdPortrait pokedexId={member.pokedexId} size={28} showFrame={true} />
                        <div>
                          <span className="font-bold text-xs text-white block">
                            {member.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            PS: {member.stats.hp}/{member.stats.maxHp}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        Aplicar
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedItemForUse(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancelar selección
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
                {inventory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No tienes objetos en la mochila.
                  </p>
                ) : (
                  inventory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        soundManager.playSelect();
                        if (item.effectType === 'restore_belly' || item.effectType === 'escape') {
                          handleUseItemOnTarget(item, 0);
                        } else {
                          setSelectedItemForUse(item);
                        }
                      }}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <span className="font-bold text-xs text-white block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {item.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                        x{item.count}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pmd-window pmd-danger bg-slate-900 border border-red-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              ¿Retirarse a la aldea?
            </h3>
            <p className="text-sm text-slate-300">
              Si abandonas la expedición ahora, <span className="font-bold text-red-400">perderás todo el dinero que llevas y todos los objetos de la mochila</span>. El dinero guardado en el PokéBanco está a salvo.
            </p>
            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-amber-300 font-mono font-bold text-sm">
              <Coins className="w-4 h-4" />
              <span>{gold} Pokécuartos</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className="text-red-400">0</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-emerald-300 font-mono font-bold text-sm">
              <Backpack className="w-4 h-4" />
              <span>{inventory.reduce((a, b) => a + b.count, 0)} objetos</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className="text-red-400">0</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setIsExitConfirmOpen(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                Seguir explorando
              </button>
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setIsExitConfirmOpen(false);
                  onExitDungeon(team, [], 0);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir a la aldea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
