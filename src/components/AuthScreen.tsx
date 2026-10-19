import React, { useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { LogIn, UserPlus } from 'lucide-react';
import { auth } from '../firebase';
import { soundManager } from '../utils/audio';
import { PmdPortrait } from './PmdSprite';
import hubVillageImg from '../assets/images/pmd_hub_village_1792068606557.jpg';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/missing-password': 'Escribe una contraseña.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a probar.',
  'auth/network-request-failed': 'No hay conexión con el servidor.',
  'auth/popup-blocked': 'El navegador ha bloqueado la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
  'auth/unauthorized-domain': 'Esta dirección no está autorizada para entrar con Google.',
  'auth/account-exists-with-different-credential': 'Ese correo ya tiene una cuenta con contraseña. Entra con correo y contraseña.',
  'auth/operation-not-allowed':
    'El acceso con correo y contraseña no está activado en Firebase (Authentication → Sign-in method).',
};

// Closing the Google window is not an error worth showing
const SILENT_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const toMessage = (error: unknown) => {
  if (error instanceof FirebaseError && ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code];
  console.error('Error de autenticación', error);
  const code = error instanceof FirebaseError ? ` (${error.code})` : '';
  return `Algo ha fallado. Inténtalo de nuevo.${code}`;
};

interface AuthScreenProps {
  // The display name is not available in the auth state right after registering
  onRegistered: (name: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onRegistered }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || busy) return;
    setError(null);
    setInfo(null);
    const trimmedName = name.trim();
    if (mode === 'register' && (trimmedName.length < 3 || trimmedName.length > 20)) {
      setError('El nombre de explorador debe tener entre 3 y 20 caracteres.');
      return;
    }
    setBusy(true);
    soundManager.playSelect();
    try {
      if (mode === 'register') {
        onRegistered(trimmedName);
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: trimmedName });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(toMessage(err));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!auth || busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    soundManager.playSelect();
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (!(err instanceof FirebaseError && SILENT_ERRORS.has(err.code))) setError(toMessage(err));
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth) return;
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Escribe tu correo para enviarte el enlace.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Te hemos enviado un correo para cambiar la contraseña.');
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg text-sm text-white outline-none select-text';

  return (
    <div className="relative w-full h-full bg-slate-950 text-white flex items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${hubVillageImg}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60" />

      <form
        onSubmit={handleSubmit}
        className="pmd-window relative z-10 w-full max-w-sm bg-slate-900/95 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <PmdPortrait pokedexId={25} emotion="Happy" size={44} showFrame={true} />
          <div>
            <h1 className="text-lg font-bold">Pokémon Mundo Misterioso: Exploradores del mundo</h1>
            <p className="text-xs text-slate-400">
              {mode === 'login' ? 'Entra con tu cuenta de explorador' : 'Crea tu cuenta de explorador'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-bold">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={`py-1.5 rounded transition-colors ${
                mode === m ? 'bg-amber-500 text-amber-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Nombre de explorador
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Correo electrónico
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            className={inputClass}
          />
        </label>

        {error && <p className="text-xs text-red-300 bg-red-950/60 border border-red-800/60 rounded-lg px-3 py-2">{error}</p>}
        {info && <p className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded-lg px-3 py-2">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-60 text-amber-950 font-extrabold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2"
        >
          {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {busy ? 'Un momento...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex-1 h-px bg-slate-700" />
          o
          <span className="flex-1 h-px bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-2.5 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-800 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2.5"
        >
          <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continuar con Google
        </button>

        {mode === 'login' && (
          <button
            type="button"
            onClick={handleResetPassword}
            className="text-[11px] text-slate-400 hover:text-white underline self-center"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </form>
    </div>
  );
};
