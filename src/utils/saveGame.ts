import { Item, Pokemon, RescueMission } from '../types/game';

const SAVE_KEY = 'pmd-expedicion-save-v1';

export interface SaveData {
  version: 1;
  activeTeam: Pokemon[];
  reserves: Pokemon[];
  gold: number;
  bankGold: number;
  inventory: Item[];
  storage: Item[];
  missions: RescueMission[];
  // True while an expedition is in progress; reloading mid-dungeon counts as abandoning it
  inDungeon: boolean;
}

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const loadGame = (): SaveData | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;

    const isValid =
      data.version === 1 &&
      Array.isArray(data.activeTeam) &&
      data.activeTeam.length > 0 &&
      Array.isArray(data.reserves) &&
      Array.isArray(data.inventory) &&
      Array.isArray(data.storage) &&
      Array.isArray(data.missions) &&
      isNonNegativeNumber(data.gold) &&
      isNonNegativeNumber(data.bankGold);

    return isValid ? (data as SaveData) : null;
  } catch {
    return null;
  }
};

export const saveGame = (data: SaveData): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable (e.g. private mode): the game keeps running without saving
  }
};

export const clearSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore unavailable storage...
  }
};
