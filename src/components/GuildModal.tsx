import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Shield, Users } from 'lucide-react';
import {
  GUILD_MAX_MEMBERS,
  GUILD_PRICE,
  Guild,
  createGuild,
  disbandGuild,
  fetchGuilds,
  fetchMemberStats,
  fetchMyGuild,
  joinGuild,
  leaveGuild,
} from '../utils/guilds';
import { LeaderboardEntry } from '../utils/leaderboard';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';
import { SPECIES_DATA } from '../data/speciesData';

interface GuildModalProps {
  uid: string;
  playerName: string;
  gold: number;
  onSpendGold: (amount: number) => void;
  onClose: () => void;
}

export const GuildModal: React.FC<GuildModalProps> = ({ uid, playerName, gold, onSpendGold, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<LeaderboardEntry[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mine = await fetchMyGuild(uid);
      setMyGuild(mine);
      if (mine) {
        const stats = await fetchMemberStats(mine.memberUids);
        setMembers(stats.sort((a, b) => b.rankPoints - a.rankPoints));
      } else {
        setGuilds(await fetchGuilds());
      }
    } catch {
      setError('No se ha podido cargar la información de los gremios. Comprueba tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<void>, failMessage: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch {
      setError(failMessage);
    } finally {
      setBusy(false);
      setConfirmExit(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 3 || name.length > 24) {
      setError('El nombre del gremio debe tener entre 3 y 24 caracteres.');
      return;
    }
    if (gold < GUILD_PRICE) {
      soundManager.playHit();
      setError(`Necesitas ${GUILD_PRICE} Pokécuartos en mano para fundar un gremio.`);
      return;
    }
    run(async () => {
      await createGuild(uid, playerName, name);
      onSpendGold(GUILD_PRICE);
      soundManager.playLevelUp();
      setNewName('');
    }, 'No se ha podido fundar el gremio.');
  };

  const isOwner = myGuild?.ownerUid === uid;
  const totalPoints = members.reduce((sum, m) => sum + m.rankPoints, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="pmd-window bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-full p-4 sm:p-6 short:p-3 shadow-2xl flex flex-col gap-3 min-h-0">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 pb-3 short:pb-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Gremio de Exploradores
            </h3>
            <p className="text-xs text-slate-400">
              {myGuild ? 'Tu gremio y sus miembros.' : 'Únete a un gremio o funda el tuyo propio.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {error && (
          <p className="shrink-0 text-xs text-red-300 bg-red-950/60 border border-red-800/60 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6">Cargando...</p>
        ) : myGuild ? (
          <>
            <div className="shrink-0 p-3 rounded-xl border border-indigo-500/60 bg-indigo-950/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-base text-white truncate">{myGuild.name}</h4>
                <p className="text-[11px] text-slate-300">
                  Fundador: <strong>{myGuild.ownerName}</strong> · {myGuild.memberUids.length}/{GUILD_MAX_MEMBERS} miembros
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-indigo-300 block">Puntos totales</span>
                <span className="font-mono font-bold text-amber-300 text-lg tabular-nums">{totalPoints}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto pr-1">
              {members.map((m, i) => (
                <div
                  key={m.uid}
                  className={`flex items-center gap-3 p-2 rounded-xl border ${
                    m.uid === uid ? 'border-amber-400 bg-amber-950/40' : 'border-slate-800 bg-slate-800/60'
                  }`}
                >
                  <span className="w-6 text-center font-pixel text-xs text-slate-300 shrink-0">{i + 1}º</span>
                  <PmdPortrait pokedexId={m.leaderPokedexId} size={32} showFrame={true} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1 font-bold text-sm text-white truncate">
                      {m.uid === myGuild.ownerUid && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="truncate">{m.name}</span>
                      {m.uid === uid && <span className="text-[10px] text-amber-300">(Tú)</span>}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      Líder: {SPECIES_DATA[m.leaderPokedexId]?.name ?? '???'}
                      {m.leaderLevel !== null && <span className="text-sky-300 font-mono"> Nv. {m.leaderLevel}</span>}
                    </span>
                  </span>
                  <span className="font-mono font-bold text-amber-300 tabular-nums text-sm shrink-0">{m.rankPoints} pts</span>
                </div>
              ))}
            </div>

            <div className="shrink-0 flex justify-end gap-2 pt-1">
              {confirmExit ? (
                <>
                  <span className="text-xs text-slate-300 self-center mr-auto">
                    {isOwner ? '¿Disolver el gremio para todos?' : '¿Seguro que quieres abandonarlo?'}
                  </span>
                  <button
                    onClick={() => setConfirmExit(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => (isOwner ? disbandGuild(myGuild.id) : leaveGuild(myGuild.id, uid)),
                        isOwner ? 'No se ha podido disolver el gremio.' : 'No se ha podido abandonar el gremio.'
                      )
                    }
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow"
                  >
                    {isOwner ? 'Disolver' : 'Abandonar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    soundManager.playSelect();
                    setConfirmExit(true);
                  }}
                  className="px-3 py-1.5 bg-transparent hover:bg-red-950/60 text-red-300 rounded-lg text-xs font-semibold border border-red-800/70"
                >
                  {isOwner ? 'Disolver gremio' : 'Abandonar gremio'}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <form
              onSubmit={handleCreate}
              className="shrink-0 p-3 rounded-xl border border-slate-700 bg-slate-800/60 flex flex-col gap-2"
            >
              <span className="text-xs font-bold text-white">Fundar un gremio</span>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={24}
                  placeholder="Nombre del gremio"
                  className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg text-sm text-white outline-none select-text"
                />
                <button
                  type="submit"
                  disabled={busy || gold < GUILD_PRICE}
                  title={gold < GUILD_PRICE ? `Necesitas ${GUILD_PRICE} Pokécuartos en mano` : undefined}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold shrink-0"
                >
                  Fundar · {GUILD_PRICE} 🪙
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                Llevas {gold} Pokécuartos. El dinero del banco no cuenta: sácalo antes si lo necesitas.
              </span>
            </form>

            <span className="shrink-0 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gremios disponibles</span>
            <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto pr-1">
              {guilds.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Aún no hay gremios. ¡Funda el primero!</p>
              )}
              {guilds.map((g) => {
                const full = g.memberUids.length >= GUILD_MAX_MEMBERS;
                return (
                  <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60">
                    <Shield className="w-6 h-6 text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block font-bold text-sm text-white truncate">{g.name}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Crown className="w-3 h-3 text-amber-400" /> {g.ownerName}
                        <span className="mx-1">·</span>
                        <Users className="w-3 h-3" /> {g.memberUids.length}/{GUILD_MAX_MEMBERS}
                      </span>
                    </div>
                    <button
                      disabled={busy || full}
                      onClick={() =>
                        run(async () => {
                          await joinGuild(g.id, uid, playerName);
                          soundManager.playDrop();
                        }, 'No se ha podido unir al gremio. Puede que esté lleno.')
                      }
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold shrink-0"
                    >
                      {full ? 'Lleno' : 'Unirse'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
