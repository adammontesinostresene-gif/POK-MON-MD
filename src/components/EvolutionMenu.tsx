import React, { useState } from 'react';
import { Pokemon, PokemonType } from '../types/game';
import {
  TYPE_COLORS,
  canPokemonEvolve,
  isEvolutionOptionAvailable,
  getEvolutionStatGains,
  evolvePokemon,
  EvolutionOption,
  getEvolutionOptions,
} from '../data/pokemonData';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Heart,
  Sword,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  Award,
  ChevronRight,
  Info,
} from 'lucide-react';

interface EvolutionMenuProps {
  activeTeam: Pokemon[];
  reserves: Pokemon[];
  availableItems: string[];
  onUpdateTeam: (newActive: Pokemon[], newReserves: Pokemon[]) => void;
  onConsumeItem: (itemName: string) => void;
  onBack: () => void;
}

export const EvolutionMenu: React.FC<EvolutionMenuProps> = ({
  activeTeam,
  reserves,
  availableItems,
  onUpdateTeam,
  onConsumeItem,
  onBack,
}) => {
  // Currently inspected Pokémon
  const [selectedId, setSelectedId] = useState<string>(
    activeTeam[0]?.id || reserves[0]?.id || ''
  );

  // Selected evolution branch index (for Pokémon like Eevee with multiple branches)
  const [selectedBranchIndex, setSelectedBranchIndex] = useState<number>(0);

  // Evolution ceremony modal state
  const [evolvingState, setEvolvingState] = useState<{
    stage: 'illuminating' | 'transformed';
    prevPokemon: Pokemon;
    evolvedPokemon: Pokemon;
    chosenOption: EvolutionOption;
  } | null>(null);

  // Filter for reserve list
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'pending'>('all');

  // Notification feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'altar'>('list');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find currently inspected Pokemon
  const inspectedPokemon =
    activeTeam.find((p) => p.id === selectedId) ||
    reserves.find((p) => p.id === selectedId) ||
    activeTeam[0] ||
    reserves[0] ||
    null;

  // Evolution eligibility analysis for inspected Pokemon
  const evolutionInfo = inspectedPokemon
    ? canPokemonEvolve(inspectedPokemon, availableItems)
    : {
        hasEvolutions: false,
        canEvolve: false,
        options: [] as EvolutionOption[],
        minLevelRequired: 0,
        levelDeficit: 0,
        requiredItems: [] as string[],
      };

  // Selected branch option
  const activeOption: EvolutionOption | undefined =
    evolutionInfo.options[selectedBranchIndex] || evolutionInfo.options[0];

  // Readiness of the selected branch (each branch can need a different stone)
  const optionReady =
    !!inspectedPokemon && !!activeOption && isEvolutionOptionAvailable(inspectedPokemon, activeOption, availableItems);
  const hasRequiredItem = !!activeOption?.requiredItem && availableItems.includes(activeOption.requiredItem);

  const previewGains =
    inspectedPokemon && activeOption ? getEvolutionStatGains(inspectedPokemon, activeOption) : null;
  const ceremonyGains = evolvingState
    ? getEvolutionStatGains(evolvingState.prevPokemon, evolvingState.chosenOption)
    : null;
  const formatGain = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

  // Count how many are ready across all members
  const readyCount = [...activeTeam, ...reserves].filter(
    (p) => canPokemonEvolve(p, availableItems).canEvolve
  ).length;

  // Trigger Evolution Ceremony
  const handleInitiateEvolution = () => {
    if (!inspectedPokemon || !activeOption || !optionReady) return;

    soundManager.playEvolution();
    if (activeOption.requiredItem) {
      onConsumeItem(activeOption.requiredItem);
    }

    const evolved = evolvePokemon(inspectedPokemon, activeOption);

    // Start Stage 1 (Illuminating)
    setEvolvingState({
      stage: 'illuminating',
      prevPokemon: inspectedPokemon,
      evolvedPokemon: evolved,
      chosenOption: activeOption,
    });

    // Advance to Stage 2 (Transformed) after 1.8 seconds
    setTimeout(() => {
      soundManager.playVictory();
      setEvolvingState((prev) =>
        prev ? { ...prev, stage: 'transformed' } : null
      );
    }, 1800);
  };

  // Finalize Evolution and commit to state
  const handleFinishEvolution = () => {
    if (!evolvingState) return;

    const { prevPokemon, evolvedPokemon } = evolvingState;
    const isInActive = activeTeam.some((p) => p.id === prevPokemon.id);

    if (isInActive) {
      const newActive = activeTeam.map((p) =>
        p.id === prevPokemon.id ? evolvedPokemon : p
      );
      onUpdateTeam(newActive, reserves);
    } else {
      const newReserves = reserves.map((p) =>
        p.id === prevPokemon.id ? evolvedPokemon : p
      );
      onUpdateTeam(activeTeam, newReserves);
    }

    setEvolvingState(null);
    showToast(`¡Tu ${prevPokemon.name} evolucionó a ${evolvedPokemon.name}!`);
  };

  // Filtered reserves list
  const filteredReserves = reserves.filter((p) => {
    const info = canPokemonEvolve(p, availableItems);
    if (filterMode === 'ready') return info.canEvolve;
    if (filterMode === 'pending') return info.hasEvolutions && !info.canEvolve;
    return true;
  });

  return (
    <div className="w-full h-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col p-2 sm:p-4 short:p-2 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-800 pb-2 sm:pb-3 mb-2 sm:mb-3 short:pb-1.5 short:mb-1.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              soundManager.playSelect();
              onBack();
            }}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a la Aldea</span>
            <span className="sm:hidden">Aldea</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl short:text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span className="truncate"><span className="hidden sm:inline">Manantial de la </span>Evolución</span>
            </h1>
            <p className="hidden md:block short:hidden text-xs text-slate-400">
              Despierta el poder latente de tus compañeros en la fuente luminosa
            </p>
          </div>
        </div>

        {readyCount > 0 ? (
          <div className="shrink-0 flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] sm:text-xs font-bold shadow animate-pulse">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              {readyCount}<span className="hidden sm:inline"> {readyCount === 1 ? 'Pokémon listo' : 'Pokémon listos'} para evolucionar</span>
            </span>
          </div>
        ) : (
          <div className="hidden md:block short:hidden text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Sube de nivel a tus Pokémon en mazmorras para desbloquear su evolución
          </div>
        )}
      </div>

      {/* Mobile tabs: list vs. altar */}
      <div className="lg:hidden shrink-0 grid grid-cols-2 gap-1 p-1 mb-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setMobileTab('list')}
          className={`py-1.5 rounded transition-colors ${
            mobileTab === 'list' ? 'bg-amber-500 text-amber-950' : 'text-slate-400'
          }`}
        >
          Pokémon
        </button>
        <button
          onClick={() => setMobileTab('altar')}
          className={`py-1.5 rounded transition-colors truncate px-1 ${
            mobileTab === 'altar' ? 'bg-emerald-500 text-emerald-950' : 'text-slate-400'
          }`}
        >
          Ritual{inspectedPokemon ? `: ${inspectedPokemon.name}` : ''}
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-amber-950 font-bold px-4 py-2 rounded-xl shadow-2xl text-sm flex items-center gap-2 border border-amber-300 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-900" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Column (Squad & Reserves) | Right Column (Evolution Altar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0">
        {/* LEFT COLUMN: Team & Reserves lists (8 cols) */}
        <div className={`${mobileTab === 'list' ? 'flex' : 'hidden'} lg:flex lg:col-span-7 flex-col gap-2 sm:gap-3 min-h-0`}>
          {/* SECTION 1: Active Squad */}
          <div className="pmd-window shrink-0 bg-slate-900/90 rounded-xl p-2 sm:p-4 short:p-2 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-400 text-xs sm:text-sm tracking-wide uppercase">
                  Equipo Activo
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">
                  ({activeTeam.length}<span className="hidden sm:inline"> aventureros</span>)
                </span>
              </div>
              <span className="hidden xl:inline text-xs text-slate-500">
                Toca cualquier Pokémon para inspeccionar su evolución
              </span>
            </div>

            {/* Active Pokémon Cards */}
            <div className="grid grid-cols-2 short:grid-cols-4 gap-1.5 sm:gap-3">
              {activeTeam.map((pokemon, idx) => {
                const isSelected = pokemon.id === inspectedPokemon?.id;
                const info = canPokemonEvolve(pokemon, availableItems);

                return (
                  <button
                    key={pokemon.id}
                    onClick={() => {
                      soundManager.playSelect();
                      setSelectedId(pokemon.id);
                      setSelectedBranchIndex(0);
                    }}
                    className={`relative p-1.5 sm:p-2.5 short:p-1.5 rounded-xl border text-left flex items-center gap-2 sm:gap-3 transition-all cursor-pointer min-w-0 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50 shadow-lg'
                        : 'border-slate-800 bg-slate-800/70 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {/* PMD Repository Portrait */}
                    <div className="w-9 h-9 sm:w-12 sm:h-12 short:w-9 short:h-9 shrink-0">
                      <PmdPortrait
                        pokedexId={pokemon.pokedexId}
                        emotion={info.canEvolve ? 'Joyous' : 'Normal'}
                        className="w-full h-full"
                        showFrame={true}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                          {pokemon.name}
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 shrink-0">
                          Nv. {pokemon.level}
                        </span>
                      </div>

                      <div className="hidden sm:flex short:hidden gap-1 my-1">
                        {pokemon.types.map((type) => {
                          const col = TYPE_COLORS[type];
                          return (
                            <span
                              key={type}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${col.bg} ${col.text}`}
                            >
                              {type}
                            </span>
                          );
                        })}
                      </div>

                      {/* Evolution Status Tag */}
                      <div className="mt-0.5 sm:mt-1 truncate">
                        {info.canEvolve ? (
                          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 px-1.5 sm:px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                            ¡Listo<span className="hidden sm:inline"> para evolucionar</span>!
                          </span>
                        ) : info.hasEvolutions ? (
                          <span className="text-[9px] sm:text-[11px] text-slate-400 font-mono">
                            {info.minLevelRequired > 0 ? (
                              <>
                                Req. Nv. {info.minLevelRequired}<span className="hidden sm:inline"> (Faltan {info.levelDeficit})</span>
                              </>
                            ) : (
                              <>Req. {info.requiredItems.join(' / ')}</>
                            )}
                          </span>
                        ) : (
                          <span className="text-[9px] sm:text-[11px] text-slate-500 italic">
                            ⭐ Forma final<span className="hidden sm:inline"> alcanzada</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Reserves (Campamento de Amigos) */}
          <div className="pmd-window bg-slate-900/90 rounded-xl p-2 sm:p-4 short:p-2 border border-slate-800 flex-1 min-h-0 flex flex-col shadow-md">
            <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-emerald-400 text-xs sm:text-sm tracking-wide uppercase truncate">
                  <span className="hidden sm:inline">Campamento de </span>Reclutas
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">
                  ({reserves.length})
                </span>
              </div>

              {/* Segmented Filter Controls */}
              <div className="shrink-0 flex items-center gap-1 p-0.5 sm:p-1 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] sm:text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded font-medium transition-colors ${
                    filterMode === 'all'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterMode('ready')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded font-medium transition-colors ${
                    filterMode === 'ready'
                      ? 'bg-emerald-900/70 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Listos
                </button>
                <button
                  onClick={() => setFilterMode('pending')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded font-medium transition-colors ${
                    filterMode === 'pending'
                      ? 'bg-amber-900/70 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  En Progreso
                </button>
              </div>
            </div>

            {filteredReserves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center border border-dashed border-slate-800 rounded-lg my-auto">
                <Info className="w-7 h-7 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">
                  No hay compañeros en esta categoría de reserva.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 short:grid-cols-5 gap-1.5 sm:gap-2.5 min-h-0 overflow-y-auto content-start pr-1">
                {filteredReserves.map((pokemon) => {
                  const isSelected = pokemon.id === inspectedPokemon?.id;
                  const info = canPokemonEvolve(pokemon, availableItems);

                  return (
                    <button
                      key={pokemon.id}
                      onClick={() => {
                        soundManager.playSelect();
                        setSelectedId(pokemon.id);
                        setSelectedBranchIndex(0);
                      }}
                      className={`p-1.5 sm:p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer min-w-0 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/50 shadow'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                          <PmdPortrait
                            pokedexId={pokemon.pokedexId}
                            emotion={info.canEvolve ? 'Joyous' : 'Normal'}
                            className="w-full h-full"
                            showFrame={true}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[10px] sm:text-xs text-white truncate block">
                            {pokemon.name}
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-mono text-amber-400">
                            Nv. {pokemon.level}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-800 truncate">
                        {info.canEvolve ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            ¡Listo!
                          </span>
                        ) : info.hasEvolutions ? (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {info.minLevelRequired > 0
                              ? `Req: Nv. ${info.minLevelRequired}`
                              : `Req: ${info.requiredItems.join(' / ')}`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            ⭐ Forma Final
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Evolution Altar & Inspector (5 cols) */}
        <div className={`${mobileTab === 'altar' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 min-h-0 overflow-y-auto pmd-window bg-slate-900/90 rounded-xl p-3 sm:p-4 short:p-2 border border-slate-800 flex-col justify-between shadow-xl`}>
          {inspectedPokemon ? (
            <div className="flex flex-col gap-2.5 sm:gap-3 short:grid short:grid-cols-2 short:gap-2">
              {/* Altar Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Ritual de Transformación
                    </h3>
                    <span className="short:hidden text-[11px] text-slate-400">
                      Manantial de la Luz Mística
                    </span>
                  </div>
                </div>
              </div>

              {/* Branch Selector if Pokémon has multiple evolutions (e.g. Eevee) */}
              {evolutionInfo.options.length > 1 && (
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 px-2 font-medium">
                    Rama:
                  </span>
                  {evolutionInfo.options.map((opt, optIdx) => (
                    <button
                      key={opt.targetPokedexId}
                      onClick={() => setSelectedBranchIndex(optIdx)}
                      className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
                        selectedBranchIndex === optIdx
                          ? 'bg-amber-500 text-amber-950 shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.targetName}
                    </button>
                  ))}
                </div>
              )}

              {/* Side-by-Side Before & After Preview */}
              <div className="bg-slate-950/70 p-2.5 sm:p-3 short:p-1.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                {/* Current Stage */}
                <div className="flex flex-col items-center text-center w-5/12">
                  <div className="relative mb-2 short:mb-0.5">
                    <PmdPortrait
                      pokedexId={inspectedPokemon.pokedexId}
                      emotion="Normal"
                      size={44}
                      showFrame={true}
                    />
                  </div>
                  <span className="font-bold text-xs text-white truncate max-w-full">
                    {inspectedPokemon.name}
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    Nivel {inspectedPokemon.level}
                  </span>
                  <div className="flex gap-1 mt-1 flex-wrap justify-center short:hidden">
                    {inspectedPokemon.types.map((t) => (
                      <span
                        key={t}
                        className={`text-[9px] px-1 py-0.1 rounded font-semibold ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transition Arrow */}
                <div className="flex flex-col items-center justify-center w-2/12">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      optionReady
                        ? 'bg-amber-500 text-amber-950 shadow-lg animate-pulse'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                    Evoluciona
                  </span>
                </div>

                {/* Evolved Stage Preview */}
                <div className="flex flex-col items-center text-center w-5/12">
                  {activeOption ? (
                    <>
                      <div className="relative mb-2 short:mb-0.5">
                        <PmdPortrait
                          pokedexId={activeOption.targetPokedexId}
                          emotion="Joyous"
                          size={44}
                          showFrame={true}
                          className={
                            optionReady
                              ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-xl'
                              : 'opacity-70'
                          }
                        />
                      </div>
                      <span className="font-bold text-xs text-emerald-300 truncate max-w-full">
                        {activeOption.targetName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {activeOption.requiredItem ? activeOption.requiredItem : `Req. Nv. ${activeOption.minLevel}`}
                      </span>
                      <div className="flex gap-1 mt-1 flex-wrap justify-center short:hidden">
                        {activeOption.types.map((t) => (
                          <span
                            key={t}
                            className={`text-[9px] px-1 py-0.1 rounded font-semibold ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text}`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-4 text-slate-500">
                      <Award className="w-8 h-8 text-amber-400 mb-1" />
                      <span className="text-xs font-bold text-amber-300">
                        Forma Definitiva
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Sin evoluciones
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement Inspection Box */}
              {activeOption ? (
                <div
                  className={`rounded-xl p-2.5 sm:p-3 short:p-2 border transition-all ${
                    optionReady
                      ? 'bg-emerald-950/30 border-emerald-500/60'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {optionReady ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="font-bold text-xs text-white">
                        {optionReady
                          ? '¡Requisitos Cumplidos!'
                          : 'Requisitos de Evolución'}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold ${
                        optionReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {activeOption.requiredItem
                        ? `${activeOption.requiredItem} ${hasRequiredItem ? '✔' : '✘'}`
                        : `Nv. ${inspectedPokemon.level} / ${activeOption.minLevel}`}
                    </span>
                  </div>

                  {/* Level progress bar (level-based branches only) */}
                  {!activeOption.requiredItem && (
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          optionReady ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (inspectedPokemon.level / activeOption.minLevel) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  <p className="hidden tall:block text-[11px] text-slate-300 leading-relaxed">
                    {optionReady ? (
                      <span className="text-emerald-300 font-medium">
                        ✨ {inspectedPokemon.name} está listo. Presiona el botón para dar paso a {activeOption.targetName}.
                      </span>
                    ) : activeOption.requiredItem ? (
                      <span className="text-slate-400">
                        ⚠️ Necesitas una <strong className="text-amber-300">{activeOption.requiredItem}</strong> en la mochila o en el almacén. Se gastará al evolucionar.
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        ⚠️ Faltan <strong className="text-amber-300">{Math.max(0, activeOption.minLevel - inspectedPokemon.level)} niveles</strong>. Puedes ganar experiencia derrotando enemigos en mazmorras.
                      </span>
                    )}
                  </p>
                </div>
              ) : null}

              {/* Stat Gains Preview */}
              {activeOption && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Mejora de Estadísticas al Evolucionar
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono short:[&>div]:py-1">
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-400" /> PS
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.hp)}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sword className="w-3 h-3 text-amber-400" /> Atq
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.attack)}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-400" /> Def
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.defense)}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">At.Esp</span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.spAttack)}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Def.Esp</span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.spDefense)}
                      </span>
                    </div>
                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" /> Vel
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatGain(previewGains!.speed)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Evolution Button */}
              <div className="pt-1">
                {optionReady && activeOption ? (
                  <button
                    onClick={handleInitiateEvolution}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl text-sm shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all border border-emerald-400"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>¡Evolucionar a {activeOption.targetName}!</span>
                  </button>
                ) : activeOption ? (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 bg-slate-800/80 border border-slate-700/80 text-slate-500 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span>
                      🔒 {activeOption.requiredItem
                        ? `Necesitas ${activeOption.requiredItem}`
                        : `No cumple requisitos (Nivel ${activeOption.minLevel} requerido)`}
                    </span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 sm:py-3 bg-slate-800/50 border border-slate-800 text-slate-500 font-medium rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span>⭐ Este Pokémon no tiene más evoluciones</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-xs">
                Selecciona cualquier Pokémon de tu equipo o campamento para inspeccionar sus opciones de evolución.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* EVOLUTION CEREMONY MODAL (Luminous Spring Transformation) */}
      {/* ========================================================= */}
      {evolvingState && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window pmd-gold bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-lg w-full max-h-full overflow-y-auto p-4 sm:p-8 short:p-3 text-center flex flex-col items-center gap-3 sm:gap-6 short:gap-2 shadow-2xl relative animate-in zoom-in-95 duration-300">
            {/* Ambient Background Aura */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-amber-500/20 pointer-events-none" />

            {/* Stage Title */}
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
                {evolvingState.stage === 'illuminating'
                  ? 'Ritual Luminoso en Curso'
                  : '¡Evolución Exitosa!'}
              </span>
              <h2 className="text-xl sm:text-3xl short:text-lg font-black text-white mt-1">
                {evolvingState.stage === 'illuminating'
                  ? `¿Qué? ¡${evolvingState.prevPokemon.name} está brillando!`
                  : `¡${evolvingState.prevPokemon.name} evolucionó a ${evolvingState.evolvedPokemon.name}!`}
              </h2>
            </div>

            {/* Transforming Portrait Animation */}
            <div className="relative my-2 short:my-0 flex items-center justify-center">
              {evolvingState.stage === 'illuminating' ? (
                <div className="relative animate-pulse">
                  <div className="absolute -inset-4 bg-amber-400/40 rounded-full blur-xl animate-ping" />
                  <PmdPortrait
                    pokedexId={evolvingState.prevPokemon.pokedexId}
                    emotion="Joyous"
                    size={80}
                    showFrame={true}
                    className="brightness-125 filter drop-shadow-2xl"
                  />
                </div>
              ) : (
                <div className="relative animate-in zoom-in-125 duration-500">
                  <div className="absolute -inset-6 bg-emerald-400/40 rounded-full blur-2xl animate-pulse" />
                  <PmdPortrait
                    pokedexId={evolvingState.evolvedPokemon.pokedexId}
                    emotion="Joyous"
                    size={90}
                    showFrame={true}
                    className="ring-4 ring-amber-400 ring-offset-4 ring-offset-slate-900 shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Description / Story text */}
            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
              {evolvingState.stage === 'illuminating'
                ? `Una cálida corriente de luz espiritual emerge del manantial y envuelve a ${evolvingState.prevPokemon.name} en energía celestial...`
                : evolvingState.chosenOption.description}
            </p>

            {/* Post-evolution Boost Summary */}
            {evolvingState.stage === 'transformed' && (
              <div className="w-full bg-slate-950/80 rounded-2xl p-3 sm:p-4 short:p-2 border border-slate-800 text-left flex flex-col gap-2 sm:gap-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Ganancias de Características:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 short:grid-cols-6 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">PS Máx:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.hp)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Ataque:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.attack)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Defensa:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.defense)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">At.Esp:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.spAttack)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Def.Esp:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.spDefense)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Vel:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatGain(ceremonyGains!.speed)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Continue Button */}
            {evolvingState.stage === 'transformed' && (
              <button
                onClick={handleFinishEvolution}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-extrabold rounded-xl text-sm shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all"
              >
                <span>¡Continuar con {evolvingState.evolvedPokemon.name}!</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
