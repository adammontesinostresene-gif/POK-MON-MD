import { Item, Pokemon, RescueMission } from '../types/game';

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

export const saveGame = (data: SaveData, profileId?: string): void => {
  try {
    localStorage.setItem(keyFor(profileId), JSON.stringify(data));
  } catch {
    // Storage full or unavailable (e.g. private mode): the game keeps running without saving
  }
};

export const clearSave = (profileId?: string): void => {
  try {
    localStorage.removeItem(keyFor(profileId));
  } catch {
    // Ignore unavailable storage...
  }
};
