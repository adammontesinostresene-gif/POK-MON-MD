import React, { useState } from 'react';
import { Pokemon, PokemonType } from '../types/game';
import { TYPE_COLORS } from '../data/pokemonData';
import { soundManager } from '../utils/audio';
import { Shield, Zap, Sparkles, Heart, Sword, ArrowLeft, ArrowUpDown, Info, Check, UserCheck } from 'lucide-react';
import { PmdSprite, PmdPortrait } from './PmdSprite';

interface TeamManagerProps {
  activeTeam: Pokemon[];
  reserves: Pokemon[];
  onUpdateTeam: (active: Pokemon[], reserves: Pokemon[]) => void;
  onBack: () => void;
}

export const TeamManager: React.FC<TeamManagerProps> = ({
  activeTeam,
  reserves,
  onUpdateTeam,
  onBack,
}) => {
  // Selected pokemon for detailed view / inspection
  const [inspectedPokemon, setInspectedPokemon] = useState<Pokemon | null>(
    activeTeam[0] || reserves[0] || null
  );

  // Dragging state
  const [draggedPokemonId, setDraggedPokemonId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'active' | 'reserves' | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [dragOverReserves, setDragOverReserves] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'boxes' | 'details'>('boxes');
  const [releaseCandidate, setReleaseCandidate] = useState<Pokemon | null>(null);

  // The current leader can never be released, so the team always keeps one
  const canRelease = (pokemon: Pokemon) => activeTeam[0]?.id !== pokemon.id;

  const handleConfirmRelease = () => {
    if (!releaseCandidate) return;
    const newActive = activeTeam.filter((p) => p.id !== releaseCandidate.id);
    const newReserves = reserves.filter((p) => p.id !== releaseCandidate.id);
    soundManager.playDrop();
    onUpdateTeam(newActive, newReserves);
    showNotification(`${releaseCandidate.name} se ha despedido del equipo`);
    if (inspectedPokemon?.id === releaseCandidate.id) {
      setInspectedPokemon(newActive[0] || newReserves[0] || null);
    }
    setReleaseCandidate(null);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Find pokemon by ID
  const findPokemon = (id: string): { pokemon: Pokemon; source: 'active' | 'reserves' } | null => {
    const act = activeTeam.find((p) => p.id === id);
    if (act) return { pokemon: act, source: 'active' };
    const res = reserves.find((p) => p.id === id);
    if (res) return { pokemon: res, source: 'reserves' };
    return null;
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string, source: 'active' | 'reserves') => {
    setDraggedPokemonId(id);
    setDragSource(source);
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, source }));
    soundManager.playSelect();
  };

  const handleDragEnd = () => {
    setDraggedPokemonId(null);
    setDragSource(null);
    setDragOverSlotIndex(null);
    setDragOverReserves(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnActiveSlot = (targetIndex: number) => {
    if (!draggedPokemonId || !dragSource) return;

    const draggedItem = findPokemon(draggedPokemonId);
    if (!draggedItem) return;

    const newActive = [...activeTeam];
    const newReserves = [...reserves];

    if (dragSource === 'active') {
      // Reordering inside active team
      const currentActiveIndex = newActive.findIndex((p) => p.id === draggedPokemonId);
      if (currentActiveIndex !== -1 && currentActiveIndex !== targetIndex) {
        if (targetIndex < newActive.length) {
          // Swap positions
          const temp = newActive[targetIndex];
          newActive[targetIndex] = newActive[currentActiveIndex];
          newActive[currentActiveIndex] = temp;
        } else {
          // Move to last available slot
          const [moved] = newActive.splice(currentActiveIndex, 1);
          newActive.push(moved);
        }
        soundManager.playDrop();
        onUpdateTeam(newActive, newReserves);
        showNotification(`Posición actualizada`);
      }
    } else {
      // Moving from reserves to active team
      const resIndex = newReserves.findIndex((p) => p.id === draggedPokemonId);
      if (resIndex !== -1) {
        const [pokemonToMove] = newReserves.splice(resIndex, 1);

        if (targetIndex < newActive.length) {
          // Replace existing active slot: existing goes to reserves
          const oldActive = newActive[targetIndex];
          newActive[targetIndex] = pokemonToMove;
          newReserves.push(oldActive);
          showNotification(`${pokemonToMove.name} sustituye a ${oldActive.name}`);
        } else if (newActive.length < 4) {
          // Add to empty active slot
          newActive.push(pokemonToMove);
          showNotification(`¡${pokemonToMove.name} se une al equipo activo!`);
        } else {
          showNotification('El equipo activo ya está lleno (máx 4)');
          return;
        }

        soundManager.playDrop();
        onUpdateTeam(newActive, newReserves);
      }
    }

    handleDragEnd();
  };

  const handleDropOnReserves = () => {
    if (!draggedPokemonId || !dragSource) return;

    if (dragSource === 'active') {
      if (activeTeam.length <= 1) {
        showNotification('¡Tu equipo debe tener al menos un integrante!');
        handleDragEnd();
        return;
      }

      const newActive = [...activeTeam];
      const newReserves = [...reserves];

      const actIndex = newActive.findIndex((p) => p.id === draggedPokemonId);
      if (actIndex !== -1) {
        const [removed] = newActive.splice(actIndex, 1);
        newReserves.push(removed);
        soundManager.playDrop();
        onUpdateTeam(newActive, newReserves);
        showNotification(`${removed.name} descansa en el campamento`);
      }
    }

    handleDragEnd();
  };

  const handleCardClick = (pokemon: Pokemon) => {
    soundManager.playSelect();
    setInspectedPokemon(pokemon);
  };

  const isReserveInspected =
    !!inspectedPokemon && reserves.some((p) => p.id === inspectedPokemon.id);

  // Tapping an empty slot places the currently highlighted reserve Pokémon there
  const handleEmptySlotClick = () => {
    if (inspectedPokemon && isReserveInspected) {
      handleAddToActive(inspectedPokemon);
    }
  };

  const handleSendToReserves = (pokemon: Pokemon) => {
    if (activeTeam.length <= 1) {
      showNotification('¡Debes tener al menos 1 Pokémon en el equipo!');
      return;
    }
    const newActive = activeTeam.filter((p) => p.id !== pokemon.id);
    const newReserves = [...reserves, pokemon];
    soundManager.playDrop();
    onUpdateTeam(newActive, newReserves);
    showNotification(`${pokemon.name} enviado al campamento`);
    if (inspectedPokemon?.id === pokemon.id) {
      setInspectedPokemon(newActive[0]);
    }
  };

  const handleAddToActive = (pokemon: Pokemon) => {
    if (activeTeam.length >= 4) {
      showNotification('El equipo ya tiene 4 Pokémon (máximo alcanzado)');
      return;
    }
    const newReserves = reserves.filter((p) => p.id !== pokemon.id);
    const newActive = [...activeTeam, pokemon];
    soundManager.playDrop();
    onUpdateTeam(newActive, newReserves);
    showNotification(`¡${pokemon.name} se une al equipo activo!`);
  };

  const handleSetLeader = (pokemon: Pokemon) => {
    const actIdx = activeTeam.findIndex((p) => p.id === pokemon.id);
    if (actIdx === 0) return;
    if (actIdx !== -1) {
      const newActive = [...activeTeam];
      const [leader] = newActive.splice(actIdx, 1);
      newActive.unshift(leader);
      soundManager.playSelect();
      onUpdateTeam(newActive, reserves);
      showNotification(`¡${leader.name} es el nuevo líder del equipo!`);
    }
  };

  return (
    <div className="w-full h-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col p-2 sm:p-4 short:p-2 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-800 pb-2 sm:pb-3 mb-2 sm:mb-3 short:pb-1.5 short:mb-1.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              soundManager.playSelect();
              onBack();
            }}
            className="shrink-0 flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-medium transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a la Aldea</span>
            <span className="sm:hidden">Aldea</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl short:text-base font-bold tracking-tight text-white flex items-center gap-2 truncate">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span className="truncate">Gestión de Equipo<span className="hidden sm:inline"> de Rescate</span></span>
            </h1>
            <p className="hidden md:block short:hidden text-xs text-slate-400">
              Arrastra o toca las cajitas para organizar a tus aventureros (Máximo 4 miembros)
            </p>
          </div>
        </div>
      </div>

      {/* Mobile tabs: boxes vs. inspector */}
      <div className="lg:hidden shrink-0 grid grid-cols-2 gap-1 p-1 mb-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setMobileTab('boxes')}
          className={`py-1.5 rounded transition-colors ${
            mobileTab === 'boxes' ? 'bg-amber-500 text-amber-950' : 'text-slate-400'
          }`}
        >
          Cajitas
        </button>
        <button
          onClick={() => setMobileTab('details')}
          className={`py-1.5 rounded transition-colors truncate px-1 ${
            mobileTab === 'details' ? 'bg-sky-500 text-sky-950' : 'text-slate-400'
          }`}
        >
          Ficha{inspectedPokemon ? `: ${inspectedPokemon.name}` : ''}
        </button>
      </div>

      {/* Floating notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2 border border-sky-400 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {notification}
        </div>
      )}

      {/* Main Grid: Active Team & Reserves on Left, Detail Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0">
        {/* Left column: Drag and Drop Boxes */}
        <div className={`${mobileTab === 'boxes' ? 'flex' : 'hidden'} lg:flex lg:col-span-8 flex-col short:flex-row gap-2 sm:gap-3 min-h-0`}>
          {/* SECTION 1: Active Squad Boxes */}
          <div className="shrink-0 short:w-2/5 bg-slate-900/90 rounded-xl p-2 sm:p-4 short:p-2 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-400 text-xs sm:text-sm tracking-wide uppercase">
                  Equipo Activo<span className="hidden sm:inline"> para Mazmorras</span>
                </span>
                <span className="text-xs text-slate-400">
                  ({activeTeam.length}/4 Pokémon)
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Arrastra las cajitas para ordenar o cambiar
              </span>
            </div>

            {/* 4 Active Slots */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const pokemon = activeTeam[slotIdx];
                const isOver = dragOverSlotIndex === slotIdx;
                const isSelected = !!pokemon && inspectedPokemon?.id === pokemon.id;
                const isDraggingThis = draggedPokemonId === pokemon?.id;

                if (pokemon) {
                  return (
                    <div
                      key={pokemon.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pokemon.id, 'active')}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        handleDragOver(e);
                        setDragOverSlotIndex(slotIdx);
                      }}
                      onDragLeave={() => setDragOverSlotIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnActiveSlot(slotIdx);
                      }}
                      onClick={() => handleCardClick(pokemon)}
                      className={`relative flex flex-col items-center justify-between p-1.5 sm:p-3 short:p-1.5 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 shadow-lg scale-102 ring-2 ring-amber-400/50'
                          : isOver
                          ? 'border-sky-400 bg-sky-950/60 scale-102'
                          : 'border-slate-700 bg-slate-800/80 hover:border-slate-500 hover:bg-slate-800'
                      } ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {/* Badge Leader / Slot number */}
                      <div className="w-full flex items-center justify-between gap-0.5 mb-1">
                        <span
                          className={`text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded truncate ${
                            slotIdx === 0
                              ? 'bg-amber-500 text-amber-950 font-bold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {slotIdx === 0 ? 'LÍDER' : `#${slotIdx + 1}`}
                        </span>
                        <span className="text-[9px] sm:text-[11px] font-mono font-medium text-slate-400">
                          Nv.{pokemon.level}
                        </span>
                      </div>

                      {/* Portrait Avatar from PMD Repository */}
                      <div className="w-10 h-10 sm:w-16 sm:h-16 short:w-10 short:h-10 flex items-center justify-center my-0.5 sm:my-1 relative">
                        <PmdPortrait
                          pokedexId={pokemon.pokedexId}
                          emotion="Normal"
                          className="w-full h-full"
                          showFrame={true}
                        />
                      </div>

                      {/* Name & Type */}
                      <span className="text-[10px] sm:text-sm font-bold text-white text-center truncate w-full">
                        {pokemon.name}
                      </span>

                      <div className="hidden sm:flex short:hidden gap-1 mt-1">
                        {pokemon.types.map((type) => {
                          const col = TYPE_COLORS[type];
                          return (
                            <span
                              key={type}
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${col.bg} ${col.text}`}
                            >
                              {type}
                            </span>
                          );
                        })}
                      </div>

                      {/* HP Bar Mini */}
                      <div className="w-full mt-1 sm:mt-2">
                        <div className="hidden sm:flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>PS</span>
                          <span className="font-mono tabular-nums">
                            {pokemon.stats.hp}/{pokemon.stats.maxHp}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${(pokemon.stats.hp / pokemon.stats.maxHp) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Remove quick action */}
                      {activeTeam.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToReserves(pokemon);
                          }}
                          title="Enviar al Campamento"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                }

                // Empty Slot
                return (
                  <div
                    key={`empty_${slotIdx}`}
                    onDragOver={(e) => {
                      handleDragOver(e);
                      setDragOverSlotIndex(slotIdx);
                    }}
                    onDragLeave={() => setDragOverSlotIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnActiveSlot(slotIdx);
                    }}
                    onClick={handleEmptySlotClick}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-24 sm:min-h-36 short:min-h-24 ${
                      isOver
                        ? 'border-sky-400 bg-sky-950/40 scale-102'
                        : isReserveInspected
                        ? 'border-amber-400/80 bg-amber-950/20'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-1 sm:mb-2">
                      +
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-400 text-center">
                      Cajita {slotIdx + 1}
                    </span>
                    <span className="hidden sm:block text-[10px] text-slate-500 text-center mt-1">
                      {isReserveInspected
                        ? 'Toca para colocar aquí'
                        : 'Arrastra un recluta'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Reserve Pokémon Box (Campamento de Amigos) */}
          <div
            onDragOver={(e) => {
              handleDragOver(e);
              setDragOverReserves(true);
            }}
            onDragLeave={() => setDragOverReserves(false)}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnReserves();
            }}
            className={`bg-slate-900/90 rounded-xl p-2 sm:p-4 short:p-2 border transition-all flex-1 min-h-0 flex flex-col ${
              dragOverReserves
                ? 'border-emerald-400 bg-emerald-950/30'
                : 'border-slate-800'
            }`}
          >
            <div className="shrink-0 flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-400 text-xs sm:text-sm tracking-wide uppercase">
                  <span className="hidden sm:inline">Campamento de </span>Reclutas<span className="hidden sm:inline"> (Reserva)</span>
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">
                  ({reserves.length}<span className="hidden sm:inline"> compañeros disponibles</span>)
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Arrastra hacia el equipo activo o toca para inspeccionar
              </span>
            </div>

            {reserves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center border border-dashed border-slate-800 rounded-lg">
                <UserCheck className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">
                  Todos tus compañeros están en el equipo activo.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ¡Explora mazmorras y rescata Pokémon para reclutar más aliados!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 short:grid-cols-4 gap-1.5 sm:gap-3 min-h-0 overflow-y-auto content-start pr-1">
                {reserves.map((pokemon) => {
                  const isSelected = inspectedPokemon?.id === pokemon.id;
                  const isDraggingThis = draggedPokemonId === pokemon.id;

                  return (
                    <div
                      key={pokemon.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pokemon.id, 'reserves')}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(pokemon)}
                      className={`relative flex flex-col items-center p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 shadow-lg scale-102 ring-2 ring-amber-400/50'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                      } ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <div className="w-full flex justify-between items-center text-[9px] sm:text-[10px] text-slate-400 mb-1">
                        <span className="hidden sm:inline">Reserva</span>
                        <span className="font-mono">Nv.{pokemon.level}</span>
                      </div>

                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center my-0.5">
                        <PmdPortrait
                          pokedexId={pokemon.pokedexId}
                          emotion="Normal"
                          className="w-full h-full"
                          showFrame={true}
                        />
                      </div>

                      <span className="text-[10px] sm:text-xs font-bold text-white text-center truncate w-full">
                        {pokemon.name}
                      </span>

                      <div className="hidden sm:flex gap-1 mt-1">
                        {pokemon.types.map((type) => {
                          const col = TYPE_COLORS[type];
                          return (
                            <span
                              key={type}
                              className={`text-[9px] px-1 py-0.2 rounded font-semibold ${col.bg} ${col.text}`}
                            >
                              {type}
                            </span>
                          );
                        })}
                      </div>

                      {/* Quick Add Button if team has space */}
                      {activeTeam.length < 4 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToActive(pokemon);
                          }}
                          className="mt-1 sm:mt-2 w-full py-1 text-[9px] sm:text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                        >
                          + Añadir<span className="hidden sm:inline"> al Equipo</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Inspected Pokémon Details & Moves */}
        <div className={`${mobileTab === 'details' ? 'flex' : 'hidden'} lg:flex lg:col-span-4 min-h-0 overflow-y-auto bg-slate-900/90 rounded-xl p-3 sm:p-4 short:p-2 border border-slate-800 flex-col justify-between`}>
          {inspectedPokemon ? (
            <div className="flex flex-col gap-2.5 sm:gap-3 short:grid short:grid-cols-2 short:gap-2">
              {/* Header Profile */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-2 sm:pb-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 short:w-12 short:h-12 shrink-0 bg-slate-800 rounded-xl p-1.5 flex items-center justify-center border border-slate-700 relative overflow-hidden">
                  <PmdPortrait
                    pokedexId={inspectedPokemon.pokedexId}
                    emotion="Normal"
                    className="w-full h-full"
                    showFrame
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">
                      {inspectedPokemon.name}
                    </h3>
                    <span className="text-xs font-mono font-semibold text-amber-400">
                      Nv. {inspectedPokemon.level}
                    </span>
                  </div>
                  <div className="flex gap-1 my-1">
                    {inspectedPokemon.types.map((type) => {
                      const col = TYPE_COLORS[type];
                      return (
                        <span
                          key={type}
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${col.bg} ${col.text}`}
                        >
                          {type}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Habilidad: <span className="text-slate-200">{inspectedPokemon.ability}</span>
                  </p>
                </div>
              </div>

              {/* Stats Overview */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Estadísticas Base
                </span>
                <div className="grid grid-cols-2 short:grid-cols-3 gap-1.5 text-xs">
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" /> PS
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.hp} / {inspectedPokemon.stats.maxHp}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sword className="w-3 h-3 text-amber-400" /> Ataque
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.attack}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-400" /> Defensa
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.defense}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Atq. Esp.
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.spAttack}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-indigo-400" /> Def. Esp.
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.spDefense}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" /> Velocidad
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {inspectedPokemon.stats.speed}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Moves Set */}
              <div className="short:col-span-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Movimientos (4 Ataques)
                </span>
                <div className="grid grid-cols-1 short:grid-cols-2 gap-1.5">
                  {inspectedPokemon.moves.map((move) => {
                    const col = TYPE_COLORS[move.type];
                    return (
                      <div
                        key={move.id}
                        className="bg-slate-800/90 rounded p-2 border border-slate-700 flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${col.bg} ${col.text}`}
                            >
                              {move.type}
                            </span>
                            {move.name}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                            PP {move.pp}/{move.maxPp}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>
                            Potencia:{' '}
                            <strong className="text-slate-200">
                              {move.power > 0 ? move.power : '—'}
                            </strong>{' '}
                            · Prec:{' '}
                            <strong className="text-slate-200">{move.accuracy}%</strong>
                          </span>
                          <span className="capitalize text-slate-400">{move.category}</span>
                        </div>
                        <p className="hidden tall:block text-[10px] text-slate-400 italic line-clamp-1">
                          {move.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions for this pokemon */}
              <div className="pt-1 flex flex-col short:flex-row short:col-span-2 gap-2">
                {activeTeam.some((p) => p.id === inspectedPokemon.id) ? (
                  <>
                    {activeTeam[0].id !== inspectedPokemon.id && (
                      <button
                        onClick={() => handleSetLeader(inspectedPokemon)}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Establecer como Líder de Equipo
                      </button>
                    )}
                    {activeTeam.length > 1 && (
                      <button
                        onClick={() => handleSendToReserves(inspectedPokemon)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
                      >
                        Enviar al Campamento (Reserva)
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    disabled={activeTeam.length >= 4}
                    onClick={() => handleAddToActive(inspectedPokemon)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {activeTeam.length < 4
                      ? 'Añadir al Equipo Activo'
                      : 'Equipo Lleno (Máx 4)'}
                  </button>
                )}
                {canRelease(inspectedPokemon) && (
                  <button
                    onClick={() => {
                      soundManager.playSelect();
                      setReleaseCandidate(inspectedPokemon);
                    }}
                    className="w-full py-2 bg-transparent hover:bg-red-950/60 text-red-300 rounded-lg text-xs font-semibold transition-colors border border-red-800/70"
                  >
                    Despedir del equipo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-xs">
                Selecciona cualquier Pokémon para ver sus estadísticas y ataques.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RELEASE CONFIRMATION MODAL */}
      {releaseCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-red-500/60 rounded-2xl max-w-sm w-full max-h-full overflow-y-auto p-4 sm:p-5 shadow-2xl flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <PmdPortrait pokedexId={releaseCandidate.pokedexId} emotion="Pain" size={44} showFrame={true} />
              <div className="min-w-0">
                <h3 className="font-bold text-base text-white">¿Despedir a {releaseCandidate.name}?</h3>
                <span className="text-xs text-slate-400 font-mono">Nv. {releaseCandidate.level}</span>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              {releaseCandidate.name} abandonará el equipo <span className="font-bold text-red-400">para siempre</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setReleaseCandidate(null);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRelease}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow transition-colors"
              >
                Despedir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
