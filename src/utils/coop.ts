import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FloorEvent, Item, Pokemon, RescueMission } from '../types/game';

const PARTIES = 'coopParties';

export const COOP_MAX_MEMBERS = 4;

export interface CoopMember {
  name: string;
  leader: Pokemon;
  gold: number;
  items: Item[];
  ready: boolean;
}

/** One pending request from a player; `data` is JSON. */
export interface CoopInput {
  key: string;
  data: string;
}

export type CoopChannel = 'vote' | 'combat' | 'decision' | 'use';

export type CoopCombatAction =
  | { kind: 'move'; memberId: string; moveId: string; targetId: string }
  | { kind: 'item'; memberId: string; itemId: string; targetIdx: number; moveIdx?: number; enemyId?: string };

export interface CoopCombatState {
  id: string;
  // Actions of every round, committed by the host; all clients replay them with the same seed
  rounds: CoopCombatAction[][];
  // Learn-move / recruitment answers, committed by the host
  decisions: Record<string, string | null>;
}

export type CoopResult = 'cleared' | 'returned' | 'escaped' | 'defeat' | 'abandoned';

export interface CoopGame {
  version: number;
  seed: string;
  dungeonId: string;
  mission: RescueMission | null;
  // Owner uid of every team slot (team[i] belongs to owners[i])
  owners: string[];
  names: Record<string, string>;
  floor: number;
  belly: number;
  team: Pokemon[];
  inventory: Item[];
  gold: number;
  event: FloorEvent | null;
  // Grows with every new event so votes never carry over
  eventSeq: number;
  eventResolved: boolean;
  message: string | null;
  missionDone: boolean;
  combat: CoopCombatState | null;
  recruits: Record<string, Pokemon[]>;
  // Items each player put into the shared bag (returned to them at the end)
  contributions?: Record<string, Item[]>;
  // Last bag request applied for each player
  handledUses: Record<string, string>;
  result: CoopResult | null;
  // Loot handed to each player when the expedition ends
  split: Record<string, { gold: number; items: Item[] }> | null;
}

export interface CoopParty {
  id: string;
  hostUid: string;
  hostName: string;
  status: 'lobby' | 'playing' | 'ended';
  dungeonId: string;
  mission: RescueMission | null;
  memberUids: string[];
  members: Record<string, CoopMember>;
  inputs: Record<string, Partial<Record<CoopChannel, CoopInput>>>;
  game: CoopGame | null;
}

export const coopMemberId = (uid: string) => `coop_${uid}`;

const parseJson = <T,>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const toParty = (id: string, data: Record<string, unknown>): CoopParty => {
  const rawMembers = (data.members as Record<string, Record<string, unknown>>) ?? {};
  const members: Record<string, CoopMember> = {};
  for (const [uid, m] of Object.entries(rawMembers)) {
    const leader = parseJson<Pokemon | null>(m.leader, null);
    if (!leader) continue;
    members[uid] = {
      name: typeof m.name === 'string' ? m.name : 'Explorador',
      leader,
      gold: typeof m.gold === 'number' ? m.gold : 0,
      items: parseJson<Item[]>(m.items, []),
      ready: m.ready === true,
    };
  }
  const status = data.status === 'playing' || data.status === 'ended' ? data.status : 'lobby';
  return {
    id,
    hostUid: typeof data.hostUid === 'string' ? data.hostUid : '',
    hostName: typeof data.hostName === 'string' ? data.hostName : 'Explorador',
    status,
    dungeonId: typeof data.dungeonId === 'string' ? data.dungeonId : '',
    mission: parseJson<RescueMission | null>(data.mission, null),
    memberUids: Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [],
    members,
    inputs: (data.inputs as CoopParty['inputs']) ?? {},
    game: parseJson<CoopGame | null>(data.game, null),
  };
};

export const subscribeParty = (
  partyId: string,
  onChange: (party: CoopParty | null) => void,
  onError: (error: Error) => void
): (() => void) => {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, PARTIES, partyId),
    (snap) => onChange(snap.exists() ? toParty(snap.id, snap.data()) : null),
    onError
  );
};

export const subscribeOpenParties = (
  onChange: (parties: CoopParty[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, PARTIES), where('status', '==', 'lobby'), limit(30)),
    (snap) => onChange(snap.docs.map((d) => toParty(d.id, d.data()))),
    onError
  );
};

/** Parties this player still belongs to (e.g. after reloading the page). */
export const fetchMyParties = async (uid: string): Promise<CoopParty[]> => {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, PARTIES), where('memberUids', 'array-contains', uid), limit(5)));
  return snap.docs.map((d) => toParty(d.id, d.data()));
};

const memberFields = (name: string, leader: Pokemon) => ({
  name: name.slice(0, 20),
  leader: JSON.stringify(leader),
  gold: 0,
  items: '[]',
  ready: false,
});

export const createParty = async (uid: string, name: string, leader: Pokemon, dungeonId: string): Promise<string> => {
  if (!db) throw new Error('Firebase no está configurado');
  const ref = await addDoc(collection(db, PARTIES), {
    hostUid: uid,
    hostName: name.slice(0, 20),
    status: 'lobby',
    dungeonId,
    mission: null,
    memberUids: [uid],
    members: { [uid]: memberFields(name, leader) },
    inputs: {},
    game: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const joinParty = async (partyId: string, uid: string, name: string, leader: Pokemon): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    memberUids: arrayUnion(uid),
    [`members.${uid}`]: memberFields(name, leader),
  });
};

/** Leaving yourself, or the host removing someone. */
export const removeMember = async (partyId: string, uid: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    memberUids: arrayRemove(uid),
    [`members.${uid}`]: deleteField(),
    [`inputs.${uid}`]: deleteField(),
  });
};

export const deleteParty = async (partyId: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, PARTIES, partyId));
};

export const updateContribution = async (
  partyId: string,
  uid: string,
  gold: number,
  items: Item[],
  ready: boolean
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    [`members.${uid}.gold`]: gold,
    [`members.${uid}.items`]: JSON.stringify(items),
    [`members.${uid}.ready`]: ready,
  });
};

export const updateLeader = async (partyId: string, uid: string, leader: Pokemon): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), { [`members.${uid}.leader`]: JSON.stringify(leader) });
};

export const setPartyDungeon = async (partyId: string, dungeonId: string, mission: RescueMission | null): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    dungeonId,
    mission: mission ? JSON.stringify(mission) : null,
  });
};

export const writeGame = async (partyId: string, game: CoopGame, status?: CoopParty['status']): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    game: JSON.stringify(game),
    ...(status ? { status } : {}),
  });
};

export const submitInput = async (
  partyId: string,
  uid: string,
  channel: CoopChannel,
  key: string,
  data: unknown
): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, PARTIES, partyId), {
    [`inputs.${uid}.${channel}`]: { key, data: JSON.stringify(data ?? null) },
  });
};

/** Deterministic PRNG so every client replays the same battle (mulberry32 seeded by a string hash). */
export const seededRandom = (seed: string): (() => number) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
