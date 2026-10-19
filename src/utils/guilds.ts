import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry } from './leaderboard';

const GUILDS = 'guilds';

export const GUILD_PRICE = 10000;
export const GUILD_MAX_MEMBERS = 20;

export interface Guild {
  id: string;
  name: string;
  ownerUid: string;
  ownerName: string;
  memberUids: string[];
  // uid -> explorer name at the time of joining
  members: Record<string, string>;
}

const toGuild = (id: string, data: Record<string, unknown>): Guild => ({
  id,
  name: typeof data.name === 'string' ? data.name : 'Gremio',
  ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
  ownerName: typeof data.ownerName === 'string' ? data.ownerName : '',
  memberUids: Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [],
  members: (data.members as Record<string, string>) ?? {},
});

export const fetchMyGuild = async (uid: string): Promise<Guild | null> => {
  if (!db) return null;
  const snapshot = await getDocs(query(collection(db, GUILDS), where('memberUids', 'array-contains', uid), limit(1)));
  const first = snapshot.docs[0];
  return first ? toGuild(first.id, first.data()) : null;
};

export const fetchGuilds = async (max = 50): Promise<Guild[]> => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, GUILDS), orderBy('createdAt', 'desc'), limit(max)));
  return snapshot.docs.map((d) => toGuild(d.id, d.data()));
};

export const createGuild = async (uid: string, playerName: string, name: string): Promise<void> => {
  if (!db) return;
  await addDoc(collection(db, GUILDS), {
    name,
    ownerUid: uid,
    ownerName: playerName.slice(0, 20),
    memberUids: [uid],
    members: { [uid]: playerName.slice(0, 20) },
    createdAt: serverTimestamp(),
  });
};

export const joinGuild = async (guildId: string, uid: string, playerName: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, GUILDS, guildId), {
    memberUids: arrayUnion(uid),
    [`members.${uid}`]: playerName.slice(0, 20),
  });
};

export const leaveGuild = async (guildId: string, uid: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, GUILDS, guildId), {
    memberUids: arrayRemove(uid),
    [`members.${uid}`]: deleteField(),
  });
};

export const disbandGuild = async (guildId: string): Promise<void> => {
  if (!db) return;
  // Subcollections are not removed with their parent document, so the chat is deleted first
  const messages = await getDocs(collection(db, GUILDS, guildId, MESSAGES));
  for (let i = 0; i < messages.docs.length; i += 450) {
    const batch = writeBatch(db);
    messages.docs.slice(i, i + 450).forEach((m) => batch.delete(m.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, GUILDS, guildId));
};

const MESSAGES = 'messages';
export const GUILD_MESSAGE_MAX_LENGTH = 300;

export interface GuildMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  createdAt: Date | null;
}

/** Live feed of the latest guild chat messages (oldest first). Returns the unsubscribe function. */
export const subscribeGuildMessages = (
  guildId: string,
  onChange: (messages: GuildMessage[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, GUILDS, guildId, MESSAGES), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) => {
      const messages = snapshot.docs.map((d) => {
        // Own messages have no server time until confirmed; use the local estimate meanwhile
        const data = d.data({ serverTimestamps: 'estimate' });
        return {
          id: d.id,
          uid: typeof data.uid === 'string' ? data.uid : '',
          name: typeof data.name === 'string' ? data.name : 'Explorador',
          text: typeof data.text === 'string' ? data.text : '',
          createdAt: data.createdAt?.toDate?.() ?? null,
        };
      });
      onChange(messages.reverse());
    },
    onError
  );
};

export const sendGuildMessage = async (guildId: string, uid: string, playerName: string, text: string): Promise<void> => {
  if (!db) return;
  await addDoc(collection(db, GUILDS, guildId, MESSAGES), {
    uid,
    name: playerName.slice(0, 20),
    text: text.slice(0, GUILD_MESSAGE_MAX_LENGTH),
    createdAt: serverTimestamp(),
  });
};

/** Leaderboard entries (rank points, leader) of the given players. */
export const fetchMemberStats = async (uids: string[]): Promise<LeaderboardEntry[]> => {
  if (!db || uids.length === 0) return [];
  const chunks: string[][] = [];
  // Firestore "in" queries accept at most 30 values
  for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
  const snapshots = await Promise.all(
    chunks.map((ids) => getDocs(query(collection(db!, 'players'), where(documentId(), 'in', ids))))
  );
  return snapshots.flatMap((s) =>
    s.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        name: typeof data.name === 'string' ? data.name : 'Explorador',
        rankPoints: typeof data.rankPoints === 'number' ? data.rankPoints : 0,
        leaderPokedexId: typeof data.leaderPokedexId === 'number' ? data.leaderPokedexId : 25,
        leaderLevel: typeof data.leaderLevel === 'number' ? data.leaderLevel : null,
      };
    })
  );
};

export interface GuildRankingEntry {
  guild: Guild;
  totalPoints: number;
}

/** Guilds ordered by the sum of their members' rank points. */
export const fetchGuildRanking = async (max = 50): Promise<GuildRankingEntry[]> => {
  const guilds = await fetchGuilds(200);
  const stats = await fetchMemberStats([...new Set(guilds.flatMap((g) => g.memberUids))]);
  const pointsByUid = new Map(stats.map((s) => [s.uid, s.rankPoints]));
  return guilds
    .map((guild) => ({
      guild,
      totalPoints: guild.memberUids.reduce((sum, uid) => sum + (pointsByUid.get(uid) ?? 0), 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, max);
};
