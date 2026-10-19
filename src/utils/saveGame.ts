import { Item, Pokemon, RescueMission } from '../types/game';
import { deleteCloudSave, fetchCloudSave, uploadCloudSave } from './cloudSave';

const SAVE_KEY = 'pmd-expedicion-save-v1';

// Each signed-in player has their own save; no profile = the original single-player key
const keyFor = (profileId?: string) => (profileId ? `${SAVE_KEY}:${profileId}` : SAVE_KEY);

export interface SaveData {
  version: 1 | 2;
  activeTeam: Pokemon[];
  reserves: Pokemon[];
  gold: number;
  bankGold: number;
  rankPoints: number;
  inventory: Item[];
  storage: Item[];
  missions: RescueMission[];
  activeMissionId?: string | null;
  seenPokedex: number[];
  caughtPokedex: number[];
  // True while an expedition is in progress; reloading mid-dungeon counts as abandoning it
  inDungeon: boolean;
  // Milliseconds timestamp, used to pick the newest copy between this device and the cloud
  savedAt?: number;
}

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const toDexIds = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id) && id > 0) : [];

export const loadGame = (profileId?: string): SaveData | null => {
  try {
    let raw = localStorage.getItem(keyFor(profileId));
    // The first account to sign in on this device inherits the old single-player save
    if (!raw && profileId) {
      raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        localStorage.setItem(keyFor(profileId), raw);
        localStorage.removeItem(SAVE_KEY);
      }
    }
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;

    const isValid =
      (data.version === 1 || data.version === 2) &&
      Array.isArray(data.activeTeam) &&
      data.activeTeam.length > 0 &&
      Array.isArray(data.reserves) &&
      Array.isArray(data.inventory) &&
      Array.isArray(data.storage) &&
      Array.isArray(data.missions) &&
      isNonNegativeNumber(data.gold) &&
      isNonNegativeNumber(data.bankGold) &&
      (data.rankPoints === undefined || isNonNegativeNumber(data.rankPoints));

    return isValid
      ? ({
          ...data,
          rankPoints: data.rankPoints ?? 0,
          seenPokedex: toDexIds(data.seenPokedex),
          caughtPokedex: toDexIds(data.caughtPokedex),
        } as SaveData)
      : null;
  } catch {
    return null;
  }
};

// Cloud uploads are batched: many state changes happen in a row while playing
const CLOUD_DEBOUNCE_MS = 3000;
let pendingCloud: { uid: string; raw: string; savedAt: number } | null = null;
let cloudTimer: number | null = null;

export const flushCloudSave = async (): Promise<void> => {
  if (cloudTimer !== null) {
    clearTimeout(cloudTimer);
    cloudTimer = null;
  }
  const pending = pendingCloud;
  pendingCloud = null;
  if (!pending) return;
  try {
    await uploadCloudSave(pending.uid, { raw: pending.raw, savedAt: pending.savedAt });
  } catch (err) {
    console.warn('No se pudo guardar la partida en la nube', err);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushCloudSave());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushCloudSave();
  });
}

export const saveGame = (data: SaveData, profileId?: string): void => {
  const savedAt = Date.now();
  const raw = JSON.stringify({ ...data, savedAt });
  try {
    localStorage.setItem(keyFor(profileId), raw);
  } catch {
    // Storage full or unavailable (e.g. private mode): the cloud copy below still works
  }
  if (!profileId) return;
  pendingCloud = { uid: profileId, raw, savedAt };
  if (cloudTimer !== null) clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => void flushCloudSave(), CLOUD_DEBOUNCE_MS);
};

export const clearSave = (profileId?: string): void => {
  try {
    localStorage.removeItem(keyFor(profileId));
  } catch {
    // Ignore unavailable storage...
  }
  if (!profileId) return;
  if (pendingCloud?.uid === profileId) pendingCloud = null;
  deleteCloudSave(profileId).catch((err) => console.warn('No se pudo borrar la partida de la nube', err));
};

/** Before loading, keeps whichever save is newer: this device's or the cloud's. */
export const syncSaveFromCloud = async (profileId: string): Promise<void> => {
  const cloud = await fetchCloudSave(profileId);
  if (!cloud) return;
  let localSavedAt = 0;
  try {
    const localRaw = localStorage.getItem(keyFor(profileId));
    localSavedAt = localRaw ? (JSON.parse(localRaw) as SaveData).savedAt ?? 0 : 0;
  } catch {
    localSavedAt = 0;
  }
  if (cloud.savedAt > localSavedAt) {
    try {
      localStorage.setItem(keyFor(profileId), cloud.raw);
    } catch {
      // Without local storage the cloud copy cannot be loaded on this device
    }
  }
};
