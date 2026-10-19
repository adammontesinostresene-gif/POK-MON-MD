import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchLeaderboard, LeaderboardEntry } from '../utils/leaderboard';
import { PmdPortrait } from './PmdSprite';
import { SPECIES_DATA } from '../data/speciesData';

interface LeaderboardModalProps {
  currentUid: string | null;
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ currentUid, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setError('No se ha podido cargar el ranking. Comprueba tu conexión.'));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-full p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 min-h-0">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-3 short:pb-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Ranking de Exploradores
            </h3>
            <p className="text-xs text-slate-400">Clasificación por puntos de rango.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto pr-1">
          {error && <p className="text-xs text-red-300 text-center py-4">{error}</p>}
          {!error && entries === null && <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>}
          {entries?.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aún no hay exploradores.</p>}
          {entries?.map((entry, i) => {
            const isMe = entry.uid === currentUid;
            return (
              <div
                key={entry.uid}
                className={`flex items-center gap-3 p-2 rounded-xl border ${
                  isMe ? 'border-amber-400 bg-amber-950/40' : 'border-slate-800 bg-slate-800/60'
                }`}
              >
                <span className="w-7 text-center font-pixel text-xs text-slate-300 shrink-0">
                  {MEDALS[i] ?? `${i + 1}º`}
                </span>
                <PmdPortrait pokedexId={entry.leaderPokedexId} size={32} showFrame={true} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-white truncate">
                    {entry.name}
                    {isMe && <span className="ml-1.5 text-[10px] text-amber-300">(Tú)</span>}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    Líder: {SPECIES_DATA[entry.leaderPokedexId]?.name ?? '???'}
                    {entry.leaderLevel !== null && <span className="text-sky-300 font-mono"> Nv. {entry.leaderLevel}</span>}
                  </span>
                </span>
                <span className="font-mono font-bold text-amber-300 tabular-nums text-sm shrink-0">
                  {entry.rankPoints} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
