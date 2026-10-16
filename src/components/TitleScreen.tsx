import React, { useEffect, useState } from 'react';
import { soundManager } from '../utils/audio';
import { Zap, Play, AlertTriangle } from 'lucide-react';
import { PmdPortrait } from './PmdSprite';

interface TitleScreenProps {
  hasSave: boolean;
  notice: string | null;
  onStartGame: () => void;
  onNewGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ hasSave, notice, onStartGame, onNewGame }) => {
  const [confirmNewGame, setConfirmNewGame] = useState<boolean>(false);

  useEffect(() => {
    if (confirmNewGame) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundManager.playSelect();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, confirmNewGame]);

  return (
    <div className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between items-center p-4 sm:p-6 short:p-3 select-none overflow-hidden">
      {/* Background with subtle zoom animation */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 animate-pulse"
        style={{
          backgroundImage: `url('/src/assets/images/pmd_hub_village_1792068606557.jpg')`,
          animationDuration: '6s',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />

      {/* Top Tagline */}
      <div className="relative z-10 pt-4 sm:pt-8 short:pt-0 text-center">
        <span className="font-pixel text-[10px] sm:text-xs text-amber-300 tracking-widest uppercase bg-slate-900/80 px-3 py-1 rounded-full border border-amber-500/30">
          Expedición de Rescate Pokémon
        </span>
      </div>

      {/* Centerpiece Hero Lockup & Bespoke Title SVG */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl text-center px-4 my-auto">
        {/* Pikachu Hero Centerpiece from PMD Sprite Repository */}
        <div className="w-28 h-28 sm:w-36 sm:h-36 short:w-20 short:h-20 mb-4 short:mb-1 relative flex items-center justify-center animate-bounce duration-1000">
          <PmdPortrait pokedexId={25} size={88} emotion="Joyous" showFrame={true} />
        </div>

        {/* Bespoke inline SVG Title Lockup */}
        <div className="w-full max-w-4xl short:max-w-2xl mb-2 short:mb-1">
          <svg viewBox="45 8 410 94" className="w-full h-auto drop-shadow-xl">
            <defs>
              <linearGradient id="titleGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="subCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Main Title Pokémon */}
            <text
              x="250"
              y="50"
              textAnchor="middle"
              fill="url(#titleGold)"
              stroke="#451a03"
              strokeWidth="4"
              fontWeight="700"
              fontSize="44"
              fontFamily="'Fredoka', system-ui, sans-serif"
              letterSpacing="2"
            >
              POKÉMON
            </text>

            {/* Subtitle Mundo Misterioso */}
            <text
              x="250"
              y="90"
              textAnchor="middle"
              fill="url(#subCyan)"
              stroke="#082f49"
              strokeWidth="3"
              fontWeight="700"
              fontSize="26"
              fontFamily="'Fredoka', system-ui, sans-serif"
              letterSpacing="3"
            >
              MUNDO MISTERIOSO
            </text>
          </svg>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6 short:mb-3 leading-relaxed">
          ¡Conviértete en el mejor explorador del mundo!
        </p>

        {/* Start Game CTA */}
        {notice && (
          <p className="mb-3 max-w-sm text-xs text-red-300 bg-red-950/70 border border-red-700/60 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}

        {confirmNewGame ? (
          <div className="flex flex-col items-center gap-2 bg-slate-900/90 border border-red-500/60 rounded-xl p-3 max-w-sm">
            <p className="text-xs sm:text-sm text-slate-200">
              ¿Empezar una partida nueva? <span className="font-bold text-red-400">Se borrará tu progreso guardado.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setConfirmNewGame(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  soundManager.playSelect();
                  onNewGame();
                }}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Borrar y empezar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                soundManager.playSelect();
                onStartGame();
              }}
              className="group px-8 py-3.5 short:py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-amber-950 font-extrabold rounded-xl text-sm sm:text-base shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer border border-amber-300"
            >
              <Play className="w-5 h-5 fill-amber-950" />
              <span>{hasSave ? 'Continuar partida' : 'Entrar al mundo Pokémon'}</span>
            </button>
            {hasSave && (
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setConfirmNewGame(true);
                }}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold border-2 border-red-400 shadow-lg shadow-red-900/50 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Nueva partida
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
