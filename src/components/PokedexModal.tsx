import React, { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { SPECIES_DATA } from '../data/speciesData';
import { TYPE_COLORS, formatDex4Digits } from '../data/pokemonData';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';

const REGIONS = [
  { name: 'Kanto', from: 1, to: 151 },
  { name: 'Johto', from: 152, to: 251 },
  { name: 'Hoenn', from: 252, to: 386 },
  { name: 'Sinnoh', from: 387, to: 493 },
  { name: 'Teselia', from: 494, to: 649 },
  { name: 'Kalos', from: 650, to: 721 },
  { name: 'Alola', from: 722, to: 809 },
  { name: 'Galar', from: 810, to: 905 },
  { name: 'Paldea', from: 906, to: 1025 },
];

const STAT_LABELS = ['PS', 'Ataque', 'Defensa', 'At. Esp.', 'Def. Esp.', 'Velocidad'];

interface PokedexModalProps {
  seenIds: number[];
  caughtIds: number[];
  onClose: () => void;
}

export const PokedexModal: React.FC<PokedexModalProps> = ({ seenIds, caughtIds, onClose }) => {
  const regions = useMemo(() => {
    const allIds = Object.keys(SPECIES_DATA)
      .map(Number)
      .sort((a, b) => a - b);
    return REGIONS.map((r) => ({ ...r, ids: allIds.filter((id) => id >= r.from && id <= r.to) })).filter(
      (r) => r.ids.length > 0
    );
  }, []);
  const caught = useMemo(() => new Set(caughtIds), [caughtIds]);
  const seen = useMemo(() => new Set([...seenIds, ...caughtIds]), [seenIds, caughtIds]);

  const [regionName, setRegionName] = useState<string>(regions[0]?.name ?? '');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const region = regions.find((r) => r.name === regionName) ?? regions[0];
  const totalSpecies = regions.reduce((n, r) => n + r.ids.length, 0);
  const countIn = (ids: number[], set: Set<number>) => ids.filter((id) => set.has(id)).length;

  const selected = selectedId !== null ? SPECIES_DATA[selectedId] : null;
  const selectedSeen = selectedId !== null && seen.has(selectedId);
  const selectedCaught = selectedId !== null && caught.has(selectedId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full h-full max-h-[44rem] p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 short:gap-2 min-h-0">
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-800 pb-3 short:pb-2">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-red-400" />
              Pokédex
            </h3>
            <p className="text-xs text-slate-400">
              Vistos: <strong className="text-white">{countIn(regions.flatMap((r) => r.ids), seen)}</strong> ·
              Reclutados: <strong className="text-white">{countIn(regions.flatMap((r) => r.ids), caught)}</strong> ·
              Total: {totalSpecies}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0">
            ✕
          </button>
        </div>

        {/* Region tabs */}
        <div className="shrink-0 flex gap-1.5 overflow-x-auto pb-1">
          {regions.map((r) => (
            <button
              key={r.name}
              onClick={() => {
                soundManager.playSelect();
                setRegionName(r.name);
                setSelectedId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
                r.name === region?.name
                  ? 'bg-red-600 border-red-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {r.name}
              <span className="ml-1.5 font-mono text-[10px] opacity-80">
                {countIn(r.ids, caught)}/{r.ids.length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row short:flex-row gap-3">
          {/* Species grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {region?.ids.map((id) => {
                const species = SPECIES_DATA[id];
                const isSeen = seen.has(id);
                const isCaught = caught.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      soundManager.playSelect();
                      setSelectedId(id);
                    }}
                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 transition-colors ${
                      selectedId === id
                        ? 'border-red-400 bg-red-950/30 ring-2 ring-red-400/40'
                        : 'border-slate-800 bg-slate-800/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-950/70 flex items-center justify-center overflow-hidden">
                      {isSeen ? (
                        <PmdPortrait
                          pokedexId={id}
                          className={`w-full h-full ${isCaught ? '' : 'grayscale opacity-70'}`}
                        />
                      ) : (
                        <span className="text-2xl font-pixel text-slate-600">?</span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">Nº {formatDex4Digits(id)}</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {isSeen ? species.name : '???'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="shrink-0 sm:w-64 short:w-56 max-h-56 sm:max-h-none short:max-h-none overflow-y-auto bg-slate-950/60 rounded-xl border border-slate-800 p-3 flex flex-col gap-2">
            {!selected ? (
              <p className="text-xs text-slate-500 text-center my-auto">Selecciona un Pokémon para ver sus datos.</p>
            ) : !selectedSeen ? (
              <div className="my-auto flex flex-col items-center gap-2 text-center">
                <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <span className="text-3xl font-pixel text-slate-600">?</span>
                </div>
                <span className="text-xs font-mono text-slate-500">Nº {formatDex4Digits(selectedId!)}</span>
                <p className="text-xs text-slate-400">
                  Aún no has visto a este Pokémon. Encuéntralo en una mazmorra para registrarlo.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <PmdPortrait
                    pokedexId={selectedId!}
                    size={56}
                    showFrame={true}
                    className={selectedCaught ? '' : 'grayscale'}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 block">Nº {formatDex4Digits(selectedId!)}</span>
                    <span className="font-bold text-white block truncate">{selected.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        selectedCaught ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {selectedCaught ? 'Reclutado' : 'Visto'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {selected.types.map((t) => (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text} ${TYPE_COLORS[t].border}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">{selected.description}</p>

                <p className="text-[11px] text-slate-400">
                  Habilidad: <strong className="text-white">{selected.ability}</strong>
                </p>

                <div className="flex flex-col gap-1">
                  {selected.baseStats.map((value, i) => (
                    <div key={STAT_LABELS[i]} className="flex items-center gap-2 text-[10px]">
                      <span className="w-14 text-slate-400 shrink-0">{STAT_LABELS[i]}</span>
                      <span className="w-7 text-right font-mono text-white tabular-nums">{value}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.min(100, (value / 200) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
