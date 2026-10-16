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

  // Click-to-move fallback (vital for mobile touchscreens)
  const [selectedForMove, setSelectedForMove] = useState<{
    id: string;
    source: 'active' | 'reserves';
  } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

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

  // Mobile Tap-To-Move handler
  const handleCardClick = (pokemon: Pokemon, source: 'active' | 'reserves') => {
    soundManager.playSelect();
    setInspectedPokemon(pokemon);

    if (selectedForMove) {
      if (selectedForMove.id === pokemon.id) {
        // Deselect
        setSelectedForMove(null);
        return;
      }

      // Execute swap or move between the two cards
      const sourceInfo = findPokemon(selectedForMove.id);
      if (!sourceInfo) {
        setSelectedForMove(null);
        return;
      }

      const newActive = [...activeTeam];
      const newReserves = [...reserves];

      if (sourceInfo.source === 'active' && source === 'reserves') {
        // Swap active with reserve
        const actIdx = newActive.findIndex((p) => p.id === sourceInfo.pokemon.id);
        const resIdx = newReserves.findIndex((p) => p.id === pokemon.id);
        if (actIdx !== -1 && resIdx !== -1) {
          const temp = newActive[actIdx];
          newActive[actIdx] = newReserves[resIdx];
          newReserves[resIdx] = temp;
          soundManager.playDrop();
          onUpdateTeam(newActive, newReserves);
          showNotification(`Cambiado ${temp.name} por ${newActive[actIdx].name}`);
        }
      } else if (sourceInfo.source === 'reserves' && source === 'active') {
        // Swap reserve with active
        const resIdx = newReserves.findIndex((p) => p.id === sourceInfo.pokemon.id);
        const actIdx = newActive.findIndex((p) => p.id === pokemon.id);
        if (resIdx !== -1 && actIdx !== -1) {
          const temp = newActive[actIdx];
          newActive[actIdx] = newReserves[resIdx];
          newReserves[resIdx] = temp;
          soundManager.playDrop();
          onUpdateTeam(newActive, newReserves);
          showNotification(`Cambiado ${temp.name} por ${newActive[actIdx].name}`);
        }
      } else if (sourceInfo.source === 'active' && source === 'active') {
        // Swap slots inside active
        const idxA = newActive.findIndex((p) => p.id === sourceInfo.pokemon.id);
        const idxB = newActive.findIndex((p) => p.id === pokemon.id);
        if (idxA !== -1 && idxB !== -1) {
          const temp = newActive[idxA];
          newActive[idxA] = newActive[idxB];
          newActive[idxB] = temp;
          soundManager.playDrop();
          onUpdateTeam(newActive, newReserves);
          showNotification(`Posiciones intercambiadas`);
        }
      }

      setSelectedForMove(null);
    } else {
      setSelectedForMove({ id: pokemon.id, source });
    }
  };

  const handleEmptySlotClick = (targetIndex: number) => {
    if (selectedForMove && selectedForMove.source === 'reserves') {
      const resIdx = reserves.findIndex((p) => p.id === selectedForMove.id);
      if (resIdx !== -1) {
        const newReserves = [...reserves];
        const newActive = [...activeTeam];
        const [moved] = newReserves.splice(resIdx, 1);
        newActive.push(moved);
        soundManager.playDrop();
        onUpdateTeam(newActive, newReserves);
        showNotification(`¡${moved.name} añadido al equipo!`);
        setSelectedForMove(null);
      }
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
    setSelectedForMove(null);
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
    setSelectedForMove(null);
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
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playSelect();
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Aldea</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Gestión de Equipo de Rescate
            </h1>
            <p className="text-xs text-slate-400">
              Arrastra o toca las cajitas para organizar a tus aventureros (Máximo 4 miembros)
            </p>
          </div>
        </div>

        {selectedForMove && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 text-xs animate-pulse">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Toca otra cajita para intercambiar</span>
            <button
              onClick={() => setSelectedForMove(null)}
              className="ml-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Floating notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2 border border-sky-400 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {notification}
        </div>
      )}

      {/* Main Grid: Active Team & Reserves on Left, Detail Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left column: Drag and Drop Boxes */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* SECTION 1: Active Squad Boxes */}
          <div className="bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-400 text-sm tracking-wide uppercase">
                  Equipo Activo para Mazmorras
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((slotIdx) => {
                const pokemon = activeTeam[slotIdx];
                const isOver = dragOverSlotIndex === slotIdx;
                const isSelected = selectedForMove?.id === pokemon?.id;
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
                      onClick={() => handleCardClick(pokemon, 'active')}
                      className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 shadow-lg scale-102 ring-2 ring-amber-400/50'
                          : isOver
                          ? 'border-sky-400 bg-sky-950/60 scale-102'
                          : 'border-slate-700 bg-slate-800/80 hover:border-slate-500 hover:bg-slate-800'
                      } ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {/* Badge Leader / Slot number */}
                      <div className="w-full flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            slotIdx === 0
                              ? 'bg-amber-500 text-amber-950 font-bold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {slotIdx === 0 ? 'LÍDER' : `Puesto ${slotIdx + 1}`}
                        </span>
                        <span className="text-[11px] font-mono font-medium text-slate-400">
                          Nv.{pokemon.level}
                        </span>
                      </div>

                      {/* Portrait Avatar from PMD Repository */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-1 relative">
                        <PmdPortrait
                          pokedexId={pokemon.pokedexId}
                          emotion="Normal"
                          size={52}
                          showFrame={true}
                        />
                      </div>

                      {/* Name & Type */}
                      <span className="text-sm font-bold text-white text-center truncate w-full">
                        {pokemon.name}
                      </span>

                      <div className="flex gap-1 mt-1">
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
                      <div className="w-full mt-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
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
                    onClick={() => handleEmptySlotClick(slotIdx)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[160px] ${
                      isOver
                        ? 'border-sky-400 bg-sky-950/40 scale-102'
                        : selectedForMove && selectedForMove.source === 'reserves'
                        ? 'border-amber-400/80 bg-amber-950/20 animate-pulse'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
                      +
                    </div>
                    <span className="text-xs font-medium text-slate-400 text-center">
                      Cajita {slotIdx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 text-center mt-1">
                      {selectedForMove && selectedForMove.source === 'reserves'
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
            className={`bg-slate-900/90 rounded-xl p-4 sm:p-5 border transition-all flex-1 ${
              dragOverReserves
                ? 'border-emerald-400 bg-emerald-950/30'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-400 text-sm tracking-wide uppercase">
                  Campamento de Reclutas (Reserva)
                </span>
                <span className="text-xs text-slate-400">
                  ({reserves.length} compañeros disponibles)
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Arrastra hacia el equipo activo o toca para inspeccionar
              </span>
            </div>

            {reserves.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-lg">
                <UserCheck className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">
                  Todos tus compañeros están en el equipo activo.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ¡Explora mazmorras y rescata Pokémon para reclutar más aliados!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {reserves.map((pokemon) => {
                  const isSelected = selectedForMove?.id === pokemon.id;
                  const isInspected = inspectedPokemon?.id === pokemon.id;
                  const isDraggingThis = draggedPokemonId === pokemon.id;

                  return (
                    <div
                      key={pokemon.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pokemon.id, 'reserves')}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(pokemon, 'reserves')}
                      className={`relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 shadow-lg scale-102 ring-2 ring-amber-400/50'
                          : isInspected
                          ? 'border-sky-500/80 bg-slate-800/90'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                      } ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <div className="w-full flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span>Reserva</span>
                        <span className="font-mono">Nv.{pokemon.level}</span>
                      </div>

                      <div className="w-14 h-14 flex items-center justify-center my-1">
                        <PmdPortrait
                          pokedexId={pokemon.pokedexId}
                          emotion="Normal"
                          size={40}
                          showFrame={true}
                        />
                      </div>

                      <span className="text-xs font-bold text-white text-center truncate w-full">
                        {pokemon.name}
                      </span>

                      <div className="flex gap-1 mt-1">
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
                          className="mt-2 w-full py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                        >
                          + Añadir al Equipo
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
        <div className="lg:col-span-4 bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
          {inspectedPokemon ? (
            <div className="flex flex-col gap-4">
              {/* Header Profile */}
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-20 h-20 bg-slate-800 rounded-xl p-2 flex items-center justify-center border border-slate-700 relative overflow-hidden">
                  <PmdPortrait
                    pokedexId={inspectedPokemon.pokedexId}
                    emotion="Normal"
                    size={56}
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
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Estadísticas Base
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
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
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Movimientos (4 Ataques)
                </span>
                <div className="flex flex-col gap-1.5">
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
                        <p className="text-[10px] text-slate-400 italic line-clamp-1">
                          {move.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions for this pokemon */}
              <div className="pt-2 flex flex-col gap-2">
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
    </div>
  );
};
