import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, updateProfile, User } from 'firebase/auth';
import App from './App';
import { AuthScreen } from './components/AuthScreen';
import { auth, isFirebaseConfigured } from './firebase';
import { flushCloudSave, syncSaveFromCloud } from './utils/saveGame';

const playerName = (user: User, registeredName: string | null): string => {
  // Google accounts carry the real full name: only the first name goes to the ranking (unless renamed in-game)
  const googleName = user.providerData.find((p) => p.providerId === 'google.com')?.displayName;
  if (googleName && user.displayName === googleName) {
    return googleName.trim().split(/\s+/)[0].slice(0, 20);
  }
  return user.displayName ?? registeredName ?? user.email?.split('@')[0] ?? 'Explorador';
};

export default function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState<boolean>(!isFirebaseConfigured);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  // Profile updates don't trigger the auth listener, so a rename is also kept here
  const [renamedTo, setRenamedTo] = useState<string | null>(null);
  // uid whose cloud save has already been brought to this device
  const [syncedUid, setSyncedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user || syncedUid === user.uid) return;
    let cancelled = false;
    syncSaveFromCloud(user.uid)
      .catch((err) => console.warn('No se pudo descargar la partida de la nube', err))
      .finally(() => {
        if (!cancelled) setSyncedUid(user.uid);
      });
    return () => {
      cancelled = true;
    };
  }, [user, syncedUid]);

  if (!ready || (user && syncedUid !== user.uid)) {
    return (
      <div className="w-full h-dvh bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        {user ? 'Cargando tu partida...' : 'Cargando...'}
      </div>
    );
  }

  if (isFirebaseConfigured && !user) {
    return (
      <div className="w-full h-dvh overflow-hidden">
        <AuthScreen onRegistered={setRegisteredName} />
      </div>
    );
  }

  const player = user ? { uid: user.uid, name: renamedTo ?? playerName(user, registeredName) } : null;

  // Remounting per account gives every player their own save
  return (
    <App
      key={player?.uid ?? 'local'}
      player={player}
      onRename={
        user
          ? async (name: string) => {
              await updateProfile(user, { displayName: name });
              setRenamedTo(name);
            }
          : undefined
      }
      onSignOut={
        auth
          ? async () => {
              await flushCloudSave();
              setRegisteredName(null);
              setRenamedTo(null);
              setSyncedUid(null);
              await signOut(auth!);
            }
          : undefined
      }
    />
  );
}
