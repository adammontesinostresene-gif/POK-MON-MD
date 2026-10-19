import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SAVES = 'saves';

// Firestore documents are limited to 1 MiB; leave room for the other fields
export const MAX_CLOUD_SAVE_CHARS = 900_000;

export interface CloudSave {
  raw: string;
  savedAt: number;
}

export const fetchCloudSave = async (uid: string): Promise<CloudSave | null> => {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, SAVES, uid));
  const data = snapshot.data();
  if (!data || typeof data.data !== 'string' || typeof data.savedAt !== 'number') return null;
  return { raw: data.data, savedAt: data.savedAt };
};

export const uploadCloudSave = async (uid: string, save: CloudSave): Promise<void> => {
  if (!db || save.raw.length > MAX_CLOUD_SAVE_CHARS) return;
  await setDoc(doc(db, SAVES, uid), { data: save.raw, savedAt: save.savedAt, updatedAt: serverTimestamp() });
};

export const deleteCloudSave = async (uid: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, SAVES, uid));
};
