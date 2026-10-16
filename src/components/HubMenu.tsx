import React, { useState } from 'react';
import { Pokemon, Dungeon, Item, RescueMission } from '../types/game';
import { DUNGEONS, TYPE_COLORS, canPokemonEvolve } from '../data/pokemonData';
import { soundManager } from '../utils/audio';
import {
  Compass,
  Users,
  Backpack,
  ClipboardList,
  Store,
  Coins,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  ChevronRight,
  Shield,
  Heart,
  Zap,
  Award,
} from 'lucide-react';
import { PmdPortrait } from './PmdSprite';
import rescueBadgeImg from '../assets/images/pmd_rescue_team_badge.png';

interface HubMenuProps {
  team: Pokemon[];
  reserves: Pokemon[];
  gold: number;
  inventory: Item[];
  missions: RescueMission[];
  onSelectDungeon: (dungeon: Dungeon) => void;
  onOpenTeamManager: () => void;
  onOpenEvolution: () => void;
  onUpdateInventory: (items: Item[]) => void;
  onUpdateGold: (gold: number) => void;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  team,
  reserves,
  gold,
  inventory,
  missions,
  onSelectDungeon,
  onOpenTeamManager,
  onOpenEvolution,
  onUpdateInventory,
  onUpdateGold,
}) => {
  const [activeModal, setActiveModal] = useState<
    'DUNGEONS' | 'BAG' | 'MISSIONS' | 'SHOP' | null
  >(null);
  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon>(DUNGEONS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.startBgm('hub');
    }
  };

  const handleBuyShopItem = (itemTemplate: { name: string; price: number; effectType: Item['effectType']; value: number; icon: string; desc: string; cat: Item['category'] }) => {
    if (gold < itemTemplate.price) {
      soundManager.playHit();
      setShopFeedback('¡No tienes suficientes Pokécuartos!');
      setTimeout(() => setShopFeedback(null), 2000);
      return;
    }

    onUpdateGold(gold - itemTemplate.price);
    soundManager.playDrop();

    const existingIdx = inventory.findIndex((it) => it.name === itemTemplate.name);
    if (existingIdx !== -1) {
      const updated = [...inventory];
      updated[existingIdx].count += 1;
      onUpdateInventory(updated);
    } else {
      const newItem: Item = {
        id: `shop_${Date.now()}`,
        name: itemTemplate.name,
        category: itemTemplate.cat,
        description: itemTemplate.desc,
        count: 1,
        effectType: itemTemplate.effectType,
        effectValue: itemTemplate.value,
        icon: itemTemplate.icon,
      };
      onUpdateInventory([...inventory, newItem]);
    }

    setShopFeedback(`¡Compraste ${itemTemplate.name}!`);
    setTimeout(() => setShopFeedback(null), 2000);
  };

  const leader = team[0] || reserves[0];
  const readyToEvolveCount = [...team, ...reserves].filter(
    (p) => canPokemonEvolve(p).canEvolve
  ).length;

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Background Village Artwork with contrast gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url('/src/assets/images/pmd_hub_village_1792068606557.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/60" />

      {/* Top Bar Contract (1-line Brand, links, 1 CTA) */}
      <header className="relative z-10 flex items-center justify-between gap-8 px-4 sm:px-8 py-4 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60">
        {/* Brand wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <img
            src={rescueBadgeImg}
            alt="Insignia de Equipo"
            className="w-8 h-8 object-contain filter drop-shadow"
          />
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-pixel text-xs sm:text-sm">
            Pokémon Mundo Misterioso
          </span>
        </div>

        {/* Status cluster: Gold & Sound */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-amber-300 font-mono text-xs sm:text-sm font-bold shadow">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="tabular-nums">{gold} Pokécuartos</span>
          </div>

          <button
            onClick={toggleSound}
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors shadow"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

        </div>
      </header>

      {/* Main Hub Showcase Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* Rescue Team Hero Strip */}
        <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Perfectly squared PMD Leader Portrait Window */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/90 shadow-2xl relative flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-amber-500/15">
              {leader && (
                <PmdPortrait
                  pokedexId={leader.pokedexId}
                  emotion="Normal"
                  className="w-full h-full p-2.5 sm:p-3 flex items-center justify-center"
                  showFrame={false}
                />
              )}
              {/* Leader Ribbon at bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 py-0.5 text-center shadow-md border-t border-amber-300/40">
                <span className="text-[9px] sm:text-[10px] font-pixel text-amber-950 font-extrabold uppercase tracking-wider block leading-none">
                  Líder
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                  Aldea Pokémon
                </span>
                <span className="text-xs font-pixel px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/40">
                  Rango Bronce
                </span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 mt-1.5">
                <img
                  src={rescueBadgeImg}
                  alt="Insignia de Equipo de Rescate"
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
                />
                <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Equipo Rescate
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Líder: <strong className="text-white">{leader?.name}</strong> (Nv. {leader?.level})
                · {team.length} {team.length === 1 ? 'miembro activo' : 'miembros activos'} · {reserves.length} en reserva
              </p>
            </div>
          </div>

          {/* Quick Active Squad Preview */}
          <div className="flex items-center gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              {team.map((member, i) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center p-1.5 rounded-lg bg-slate-800/90 border border-slate-700 w-16"
                >
                  <PmdPortrait pokedexId={member.pokedexId} emotion="Normal" size={36} />
                  <span className="text-[10px] font-bold text-white truncate max-w-full mt-1">
                    {member.name}
                  </span>
                </div>
              ))}
              {/* Empty slot indicators up to 4 */}
              {Array.from({ length: 4 - team.length }).map((_, i) => (
                <div
                  key={`empty_slot_${i}`}
                  onClick={() => {
                    soundManager.playSelect();
                    onOpenTeamManager();
                  }}
                  className="w-16 h-18 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 transition-colors p-1"
                >
                  <span className="text-slate-500 text-xs">+</span>
                  <span className="text-[9px] text-slate-500 text-center">Vacío</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Core Action Hub Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Card 1: Explorar Mazmorras */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setActiveModal('DUNGEONS');
            }}
            className="group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-5 border border-slate-800 hover:border-sky-400 transition-all text-left flex flex-col justify-between shadow-xl min-h-[170px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/80 flex items-center justify-center text-sky-300 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                Explorar Mazmorra
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Elige tu destino: Bosque Místico, Cueva Resonante o Pico Tempestad.
              </p>
            </div>
          </button>

          {/* Card 2: Modificar Equipo (Drag & Drop con Cajitas) */}
          <button
            onClick={() => {
              soundManager.playSelect();
              onOpenTeamManager();
            }}
            className="group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-5 border-2 border-amber-500/70 hover:border-amber-400 transition-all text-left flex flex-col justify-between shadow-xl min-h-[170px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/80 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Drag & Drop
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                Modificar Equipo
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Organiza tus Pokémon en cajitas activas y de reserva mediante arrastrar y soltar.
              </p>
            </div>
          </button>

          {/* Card 3: Manantial de la Evolución */}
          <button
            onClick={() => {
              soundManager.playSelect();
              onOpenEvolution();
            }}
            className="group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-5 border-2 border-violet-500/70 hover:border-violet-400 transition-all text-left flex flex-col justify-between shadow-xl min-h-[170px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/80 flex items-center justify-center text-violet-300 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              {readyToEvolveCount > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ¡{readyToEvolveCount} Listo!
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40">
                  Evolución
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-violet-300 group-hover:text-violet-200 transition-colors">
                Manantial Evolución
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Revisa los requisitos y evoluciona a tus Pokémon con el poder de la luz.
              </p>
            </div>
          </button>

          {/* Card 4: Mochila / Inventario */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setActiveModal('BAG');
            }}
            className="group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-5 border border-slate-800 hover:border-emerald-400 transition-all text-left flex flex-col justify-between shadow-xl min-h-[170px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/80 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <Backpack className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {inventory.reduce((a, b) => a + b.count, 0)} obj.
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Mochila y Objetos
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Revisa tus Bayas Aranja, Manzanas para el hambre, Semillas y Orbes.
              </p>
            </div>
          </button>

          {/* Card 5: Bazar de Kecleon (Tienda) */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setActiveModal('SHOP');
            }}
            className="group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-5 border border-slate-800 hover:border-purple-400 transition-all text-left flex flex-col justify-between shadow-xl min-h-[170px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/80 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Bazar de Kecleon
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Abastece provisiones esenciales para tus próximas expediciones.
              </p>
            </div>
          </button>
        </div>
      </main>

      {/* Footer hint bar */}
      <footer className="relative z-10 px-6 py-3 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm text-center text-xs text-slate-500">
        Juego inspirado en Pokémon Mundo Misterioso · Sistema de mazmorras por eventos y combates tácticos
      </footer>

      {/* MODAL: DUNGEON SELECTOR */}
      {activeModal === 'DUNGEONS' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400" />
                  Seleccionar Mazmorra Misteriosa
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cada piso pondrá a prueba tus decisiones y habilidades de combate
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DUNGEONS.map((dungeon) => {
                const isSelected = selectedDungeon.id === dungeon.id;
                return (
                  <button
                    key={dungeon.id}
                    onClick={() => {
                      soundManager.playSelect();
                      setSelectedDungeon(dungeon);
                    }}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50'
                        : 'border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                        {dungeon.difficulty} · Nv. {dungeon.recommendedLevel}+
                      </span>
                      <h4 className="font-bold text-sm text-white">{dungeon.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {dungeon.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span>{dungeon.floorsCount} Pisos</span>
                      <span className="text-amber-300">+{dungeon.rewards.gold} 🪙</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Dungeon Preview Box */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                  Expedición Seleccionada
                </span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {selectedDungeon.name} ({selectedDungeon.floorsCount} Pisos con Jefe)
                </span>
                <span className="text-xs text-emerald-400 block mt-1">
                  Recompensa base: +{selectedDungeon.rewards.gold} Pokécuartos y experiencia garantizada
                </span>
              </div>

              <button
                onClick={() => {
                  soundManager.playSelect();
                  setActiveModal(null);
                  onSelectDungeon(selectedDungeon);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4 fill-amber-950" />
                Iniciar Expedición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOCHILA / INVENTORY */}
      {activeModal === 'BAG' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Backpack className="w-5 h-5 text-emerald-400" />
                Mochila de Objetos
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <span className="font-bold text-sm text-white block">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.description}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                    x{item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BAZAR KECLEON */}
      {activeModal === 'SHOP' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-400" />
                  Bazar de Kecleon
                </h3>
                <p className="text-xs text-slate-400">
                  "¡Bienvenido, explorador! Aquí tienes lo mejor para tus viajes."
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {shopFeedback && (
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 text-xs text-center font-bold">
                {shopFeedback}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {[
                {
                  name: 'Baya Aranja',
                  price: 80,
                  value: 50,
                  effectType: 'heal_hp' as const,
                  icon: '🍎',
                  cat: 'healing' as const,
                  desc: 'Restaura 50 PS en momentos de apuro.',
                },
                {
                  name: 'Manzana Grande',
                  price: 60,
                  value: 50,
                  effectType: 'restore_belly' as const,
                  icon: '🍏',
                  cat: 'food' as const,
                  desc: 'Recupera 50 de Hambre/Tripa.',
                },
                {
                  name: 'Semilla Revivir',
                  price: 250,
                  value: 100,
                  effectType: 'revive' as const,
                  icon: '🌰',
                  cat: 'seed' as const,
                  desc: 'Revive inmediatamente al líder o compañero caído.',
                },
                {
                  name: 'Semilla Sueño',
                  price: 120,
                  value: 3,
                  effectType: 'inflict_status' as const,
                  icon: '💤',
                  cat: 'seed' as const,
                  desc: 'Duerme al Pokémon rival durante el combate.',
                },
              ].map((shopItem) => (
                <div
                  key={shopItem.name}
                  className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{shopItem.icon}</span>
                    <div>
                      <span className="font-bold text-sm text-white block">
                        {shopItem.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {shopItem.desc}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyShopItem(shopItem)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow flex items-center gap-1 shrink-0"
                  >
                    <span>{shopItem.price} 🪙</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
