import React, { useState } from 'react';
import { Pokemon, Dungeon, Item, RescueMission } from '../types/game';
import { DUNGEONS, TYPE_COLORS, canPokemonEvolve, BAG_LIMIT, bagCount, bagSpace } from '../data/pokemonData';
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
  Landmark,
  Warehouse,
} from 'lucide-react';
import { PmdPortrait } from './PmdSprite';
import rescueBadgeImg from '../assets/images/pmd_rescue_team_badge.png';

interface HubMenuProps {
  team: Pokemon[];
  reserves: Pokemon[];
  gold: number;
  rankPoints: number;
  bankGold: number;
  inventory: Item[];
  storage: Item[];
  missions: RescueMission[];
  onSelectDungeon: (dungeon: Dungeon) => void;
  onOpenTeamManager: () => void;
  onOpenEvolution: () => void;
  onUpdateInventory: (items: Item[]) => void;
  onUpdateGold: (gold: number) => void;
  onUpdateBank: (gold: number, bankGold: number) => void;
  onUpdateStorage: (inventory: Item[], storage: Item[]) => void;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  team,
  reserves,
  gold,
  rankPoints,
  bankGold,
  inventory,
  storage,
  missions,
  onSelectDungeon,
  onOpenTeamManager,
  onOpenEvolution,
  onUpdateInventory,
  onUpdateGold,
  onUpdateBank,
  onUpdateStorage,
}) => {
  const [activeModal, setActiveModal] = useState<
    'DUNGEONS' | 'BAG' | 'MISSIONS' | 'SHOP' | 'BANK' | 'STORAGE' | null
  >(null);
  const [selectedDungeon, setSelectedDungeon] = useState<Dungeon>(DUNGEONS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);
  const [bankAmount, setBankAmount] = useState<string>('');
  const [bankFeedback, setBankFeedback] = useState<string | null>(null);

  const transferItem = (item: Item, quantity: number, toStorage: boolean) => {
    const from = toStorage ? inventory : storage;
    const to = toStorage ? storage : inventory;
    const amount = Math.min(quantity, item.count, toStorage ? item.count : bagSpace(inventory));
    if (amount <= 0) {
      soundManager.playHit();
      return;
    }

    const newFrom = from
      .map((it) => (it.id === item.id ? { ...it, count: it.count - amount } : it))
      .filter((it) => it.count > 0);
    const existing = to.find((it) => it.name === item.name);
    const newTo = existing
      ? to.map((it) => (it === existing ? { ...it, count: it.count + amount } : it))
      : [...to, { ...item, count: amount }];

    soundManager.playDrop();
    if (toStorage) {
      onUpdateStorage(newFrom, newTo);
    } else {
      onUpdateStorage(newTo, newFrom);
    }
  };

  const showBankFeedback = (msg: string) => {
    setBankFeedback(msg);
    setTimeout(() => setBankFeedback(null), 2000);
  };

  const handleBankTransfer = (mode: 'deposit' | 'withdraw', all = false) => {
    const available = mode === 'deposit' ? gold : bankGold;
    const amount = all ? available : Math.floor(Number(bankAmount));

    if (!Number.isFinite(amount) || amount <= 0) {
      soundManager.playHit();
      showBankFeedback('Introduce una cantidad válida.');
      return;
    }
    if (amount > available) {
      soundManager.playHit();
      showBankFeedback(
        mode === 'deposit' ? '¡No llevas tantos Pokécuartos!' : '¡No tienes tanto dinero en el banco!'
      );
      return;
    }

    soundManager.playDrop();
    if (mode === 'deposit') {
      onUpdateBank(gold - amount, bankGold + amount);
      showBankFeedback(`Depositaste ${amount} Pokécuartos.`);
    } else {
      onUpdateBank(gold + amount, bankGold - amount);
      showBankFeedback(`Retiraste ${amount} Pokécuartos.`);
    }
    setBankAmount('');
  };

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
    if (bagSpace(inventory) === 0) {
      soundManager.playHit();
      setShopFeedback(`¡Tu mochila está llena (${BAG_LIMIT}/${BAG_LIMIT})! Guarda algo en el almacén.`);
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
    (p) => canPokemonEvolve(p, [...inventory, ...storage].map((it) => it.name)).canEvolve
  ).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
      {/* Background Village Artwork with contrast gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `url('/src/assets/images/pmd_hub_village_1792068606557.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/60" />

      {/* Top Bar Contract (1-line Brand, links, 1 CTA) */}
      <header className="relative z-10 shrink-0 flex items-center justify-between gap-2 sm:gap-8 px-3 sm:px-8 py-2 sm:py-4 short:py-1.5 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60">
        {/* Brand wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <img
            src={rescueBadgeImg}
            alt="Insignia de Equipo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain filter drop-shadow shrink-0"
          />
          <span className="font-bold tracking-tight text-white font-pixel text-[9px] sm:text-sm truncate">
            Pokémon Mundo Misterioso
          </span>
        </div>

        {/* Status cluster: Gold & Sound */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-amber-300 font-mono text-xs sm:text-sm font-bold shadow">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="tabular-nums">
              {gold}
              <span className="hidden sm:inline"> Pokécuartos</span>
            </span>
          </div>

          <button
            onClick={toggleSound}
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors shadow"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

        </div>
      </header>

      {/* Main Hub Showcase Content */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-center gap-2 sm:gap-3 md:gap-4 short:gap-1.5 max-w-6xl w-full mx-auto p-2 sm:p-4 short:p-1.5 overflow-hidden">
        {/* Rescue Team Hero Strip */}
        <div className="pmd-window shrink-0 bg-slate-900/85 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 md:p-4 short:p-1.5 border border-slate-800 shadow-2xl flex flex-col md:flex-row short:flex-row items-center justify-between gap-2.5 sm:gap-4 short:gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 short:gap-2 w-full md:w-auto short:w-auto">
            {/* Perfectly squared PMD Leader Portrait Window */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 short:w-12 short:h-12 aspect-square rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/90 shadow-2xl relative flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-amber-500/15">
              {leader && (
                <PmdPortrait
                  pokedexId={leader.pokedexId}
                  emotion="Normal"
                  className="w-full h-full p-2 sm:p-2.5 flex items-center justify-center"
                  showFrame={false}
                />
              )}
              {/* Leader Ribbon at bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 py-0.5 text-center shadow-md border-t border-amber-300/40">
                <span className="text-[8px] sm:text-[9px] font-pixel text-amber-950 font-extrabold uppercase tracking-wider block leading-none">
                  Líder
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-2 short:hidden">
                <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-amber-400">
                  Aldea Pokémon
                </span>
                <span className="text-[10px] sm:text-xs font-pixel px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/40">
                  Rango Madera · {rankPoints} puntos
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5 mt-0.5 sm:mt-1 short:mt-0">
                <img
                  src={rescueBadgeImg}
                  alt="Insignia de Equipo de Rescate"
                  className="hidden sm:block w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
                />
                <h2 className="text-base sm:text-2xl short:text-base font-extrabold text-white tracking-tight">
                  Equipo Rescate
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 mt-0.5">
                Líder: <strong className="text-white">{leader?.name}</strong> (Nv. {leader?.level})
                · {team.length} {team.length === 1 ? 'miembro activo' : 'miembros activos'} · {reserves.length} en reserva
              </p>
            </div>
          </div>

          {/* Quick Active Squad Preview */}
          <div className="hidden sm:flex short:flex items-center gap-1.5 bg-slate-950/70 p-1.5 sm:p-2 short:p-1 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center p-1 rounded-lg bg-slate-800/90 border border-slate-700 w-12 sm:w-14"
                >
                  <PmdPortrait pokedexId={member.pokedexId} emotion="Normal" size={28} />
                  <span className="text-[9px] font-bold text-white truncate max-w-full mt-0.5 short:hidden">
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
                  className="w-12 sm:w-14 self-stretch min-h-10 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 transition-colors p-0.5"
                >
                  <span className="text-slate-500 text-xs">+</span>
                  <span className="text-[8px] text-slate-500 text-center">Vacío</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Core Action Hub Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 short:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3 short:gap-1.5 min-h-0">
          {/* Card 1: Explorar Mazmorras */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setActiveModal('DUNGEONS');
            }}
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border border-slate-800 hover:border-sky-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-sky-500/20 border border-sky-400/80 flex items-center justify-center text-sky-300 group-hover:scale-105 transition-transform">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                Explorar Mazmorra
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
                Elige tu destino: Bosquejo Tutorial o Arroyo Corriente.
              </p>
            </div>
          </button>

          {/* Card 2: Modificar Equipo (Drag & Drop con Cajitas) */}
          <button
            onClick={() => {
              soundManager.playSelect();
              onOpenTeamManager();
            }}
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border-2 border-amber-500/70 hover:border-amber-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-amber-500/20 border border-amber-400/80 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                Equipo
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
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
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border-2 border-violet-500/70 hover:border-violet-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-violet-500/20 border border-violet-400/80 flex items-center justify-center text-violet-300 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {readyToEvolveCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ¡{readyToEvolveCount} Listo!
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-violet-300 transition-colors">
                Manantial Evolución
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
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
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border border-slate-800 hover:border-emerald-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/80 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <Backpack className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-400">
                {inventory.reduce((a, b) => a + b.count, 0)} obj.
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Mochila y Objetos
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
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
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border border-slate-800 hover:border-purple-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-purple-500/20 border border-purple-400/80 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform overflow-hidden">
                <PmdPortrait pokedexId={352} emotion="Normal" className="w-full h-full" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Bazar de Kecleon
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
                Abastece provisiones esenciales para tus próximas expediciones.
              </p>
            </div>
          </button>

          {/* Card 6: PokéBanco */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setBankAmount('');
              setActiveModal('BANK');
            }}
            className="pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border border-slate-800 hover:border-cyan-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/80 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform overflow-hidden">
                <PmdPortrait pokedexId={999} emotion="Normal" className="w-full h-full" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-300 tabular-nums">
                {bankGold} 🪙
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                PokéBanco
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
                Guarda tus Pokécuartos a salvo antes de entrar en una mazmorra.
              </p>
            </div>
          </button>

          {/* Card 7: Almacén Kangaskhan */}
          <button
            onClick={() => {
              soundManager.playSelect();
              setActiveModal('STORAGE');
            }}
            className="col-span-2 md:col-span-1 short:col-span-1 pmd-window pmd-window-btn group relative bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 md:p-3.5 short:p-1.5 border border-slate-800 hover:border-orange-400 transition-all text-left flex flex-col justify-start gap-1.5 shadow-xl min-h-0 sm:min-h-[100px] md:min-h-[115px] short:min-h-0"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 short:w-7 short:h-7 rounded-xl bg-orange-500/20 border border-orange-400/80 flex items-center justify-center text-orange-300 group-hover:scale-105 transition-transform overflow-hidden">
                <PmdPortrait pokedexId={115} emotion="Normal" className="w-full h-full" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-orange-300 tabular-nums">
                {storage.reduce((a, b) => a + b.count, 0)} obj.
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                Almacén Kangaskhan
              </h3>
              <p className="hidden sm:block short:hidden text-[11px] text-slate-400 mt-0.5 line-clamp-1 md:line-clamp-2 leading-tight">
                Deja tus objetos a buen recaudo para no perderlos en las mazmorras.
              </p>
            </div>
          </button>
        </div>
      </main>

      {/* Footer hint bar */}
      <footer className="hidden md:block short:hidden shrink-0 relative z-10 px-4 py-2 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm text-center text-xs text-slate-500">
        Juego inspirado en Pokémon Mundo Misterioso · Sistema de mazmorras por eventos y combates tácticos
      </footer>

      {/* MODAL: DUNGEON SELECTOR */}
      {activeModal === 'DUNGEONS' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-full overflow-y-auto p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4 short:gap-2 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 sm:pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400" />
                  Seleccionar Mazmorra Misteriosa
                </h3>
                <p className="hidden sm:block short:hidden text-xs text-slate-400 mt-0.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 short:grid-cols-3 gap-2 sm:gap-3">
              {DUNGEONS.map((dungeon) => {
                const isSelected = selectedDungeon.id === dungeon.id;
                return (
                  <button
                    key={dungeon.id}
                    onClick={() => {
                      soundManager.playSelect();
                      setSelectedDungeon(dungeon);
                    }}
                    className={`p-2.5 sm:p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
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
                      <p className="hidden sm:block short:hidden text-xs text-slate-400 mt-1 line-clamp-2">
                        {dungeon.description}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 sm:pt-3 sm:mt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span>{dungeon.floorsCount} Pisos</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Dungeon Preview Box */}
            <div className="bg-slate-800/80 rounded-xl p-3 sm:p-4 border border-slate-700 flex flex-col sm:flex-row short:flex-row items-center justify-between gap-3 sm:gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                  Expedición Seleccionada
                </span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {selectedDungeon.name} ({selectedDungeon.floorsCount} Pisos con Jefe)
                </span>
                <span className="text-xs text-emerald-400 block mt-1">
                  Las recompensas se encuentran durante la exploración
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

      {/* MODAL: ALMACÉN KANGASKHAN */}
      {activeModal === 'STORAGE' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-full p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4 short:gap-2 min-h-0">
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-800 pb-3 short:pb-2">
              <div className="flex items-center gap-3 min-w-0">
                <PmdPortrait pokedexId={115} emotion="Happy" size={40} showFrame={true} className="short:hidden" />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-orange-400" />
                    Almacén Kangaskhan
                  </h3>
                  <p className="text-xs text-slate-400">
                    "¡Lo que dejes aquí estará a salvo! Lo que lleves en la mochila se pierde si caes o abandonas una mazmorra."
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 short:grid-cols-2 gap-3 min-h-0 flex-1">
              {[
                { title: 'Mochila', items: inventory, toStorage: true, accent: 'text-emerald-400', action: 'Guardar' },
                { title: 'Almacén', items: storage, toStorage: false, accent: 'text-orange-400', action: 'Sacar' },
              ].map((column) => (
                <div key={column.title} className="flex flex-col gap-2 min-h-0 bg-slate-950/60 rounded-xl border border-slate-800 p-2 sm:p-3">
                  <div className="shrink-0 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className={column.accent}>{column.title}</span>
                    <span className="text-slate-500 font-mono">
                      {column.items.reduce((a, b) => a + b.count, 0)}{column.toStorage ? `/${BAG_LIMIT}` : ''} obj.
                    </span>
                  </div>
                  {column.items.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Vacío</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto pr-1">
                      {column.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl">{item.icon}</span>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-white block truncate">{item.name}</span>
                              <span className="text-[10px] font-mono text-amber-400">x{item.count}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => transferItem(item, 1, column.toStorage)}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-bold transition-colors"
                            >
                              {column.action} 1
                            </button>
                            {item.count > 1 && (
                              <button
                                onClick={() => transferItem(item, item.count, column.toStorage)}
                                className={`px-2 py-1 rounded text-[10px] font-bold text-white transition-colors ${
                                  column.toStorage ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'
                                }`}
                              >
                                Todo
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POKÉBANCO */}
      {activeModal === 'BANK' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-full overflow-y-auto p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4 short:gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 short:pb-2">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-cyan-400" />
                  PokéBanco
                </h3>
                <p className="text-xs text-slate-400">
                  El dinero del banco está a salvo. El que lleves encima se pierde si caes o abandonas una mazmorra.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 short:p-2 bg-slate-800/80 border border-slate-700 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  En mano
                </span>
                <span className="font-mono font-bold text-amber-300 text-lg tabular-nums flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  {gold}
                </span>
              </div>
              <div className="p-3 short:p-2 bg-cyan-950/40 border border-cyan-700/60 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block">
                  En el banco
                </span>
                <span className="font-mono font-bold text-cyan-300 text-lg tabular-nums flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  {bankGold}
                </span>
              </div>
            </div>

            {bankFeedback && (
              <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-200 text-xs text-center font-bold">
                {bankFeedback}
              </div>
            )}

            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={bankAmount}
              onChange={(e) => setBankAmount(e.target.value)}
              placeholder="Cantidad de Pokécuartos"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg text-sm font-mono text-white outline-none select-text"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleBankTransfer('deposit')}
                className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs sm:text-sm font-bold transition-colors shadow"
              >
                Depositar
              </button>
              <button
                onClick={() => handleBankTransfer('withdraw')}
                className="py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs sm:text-sm font-bold transition-colors shadow"
              >
                Retirar
              </button>
              <button
                onClick={() => handleBankTransfer('deposit', true)}
                disabled={gold <= 0}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
              >
                Depositar todo
              </button>
              <button
                onClick={() => handleBankTransfer('withdraw', true)}
                disabled={bankGold <= 0}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
              >
                Retirar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOCHILA / INVENTORY */}
      {activeModal === 'BAG' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-full p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Backpack className="w-5 h-5 text-emerald-400" />
                Mochila de Objetos
                <span className="text-xs font-mono text-slate-400">({bagCount(inventory)}/{BAG_LIMIT})</span>
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 short:grid-cols-2 gap-2 min-h-0 overflow-y-auto">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-2 sm:p-3 short:p-1.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 short:gap-2 min-w-0">
                    <span className="text-2xl short:text-xl">{item.icon}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-white block">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400 line-clamp-2 short:line-clamp-1">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-full overflow-y-auto p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 sm:gap-4 short:gap-2">
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

            <div className="grid grid-cols-1 short:grid-cols-2 gap-2 sm:gap-2.5">
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
                {
                  name: 'Elixir',
                  price: 150,
                  value: 10,
                  effectType: 'restore_pp' as const,
                  icon: '🧪',
                  cat: 'healing' as const,
                  desc: 'Restaura 10 PP de un movimiento.',
                },
              ].map((shopItem) => (
                <div
                  key={shopItem.name}
                  className="p-2 sm:p-3 short:p-1.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 short:gap-2 min-w-0">
                    <span className="text-2xl short:text-xl">{shopItem.icon}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-white block">
                        {shopItem.name}
                      </span>
                      <span className="text-xs text-slate-400 line-clamp-2 short:line-clamp-1">
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
