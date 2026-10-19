import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { GUILD_MESSAGE_MAX_LENGTH, GuildMessage, sendGuildMessage, subscribeGuildMessages } from '../utils/guilds';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';

interface GuildChatProps {
  guildId: string;
  uid: string;
  playerName: string;
  // uid -> current leader Pokédex number of each member
  leaders: Record<string, number>;
}

const formatTime = (date: Date | null) =>
  date ? date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

export const GuildChat: React.FC<GuildChatProps> = ({ guildId, uid, playerName, leaders }) => {
  const [messages, setMessages] = useState<GuildMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      subscribeGuildMessages(guildId, setMessages, () =>
        setError('No se ha podido cargar el chat. Comprueba tu conexión.')
      ),
    [guildId]
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendGuildMessage(guildId, uid, playerName, message);
      soundManager.playTextBlip();
      setText('');
    } catch {
      setError('No se ha podido enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div
        ref={listRef}
        className="flex-1 min-h-[220px] max-h-[50vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-2 flex flex-col gap-1.5"
      >
        {messages === null && !error && <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>}
        {messages?.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">Aún no hay mensajes. ¡Saluda a tu gremio!</p>
        )}
        {messages?.map((m) => {
          const mine = m.uid === uid;
          const leaderId = leaders[m.uid];
          return (
            <div key={m.id} className={`flex items-end gap-1.5 max-w-[90%] ${mine ? 'self-end flex-row-reverse' : 'self-start'}`}>
              {leaderId ? (
                <PmdPortrait pokedexId={leaderId} size={28} showFrame={true} />
              ) : (
                // Former members are no longer in the guild's member list
                <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-sm">
                  ?
                </span>
              )}
              <div className={`flex flex-col min-w-0 ${mine ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-400 px-1">
                  {mine ? 'Tú' : m.name} · {formatTime(m.createdAt)}
                </span>
                <span
                  className={`px-2.5 py-1.5 rounded-xl text-sm break-words whitespace-pre-wrap select-text max-w-full ${
                    mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <form onSubmit={handleSend} className="shrink-0 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={GUILD_MESSAGE_MAX_LENGTH}
          placeholder="Escribe un mensaje..."
          className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg text-sm text-white outline-none select-text"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          title="Enviar"
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
