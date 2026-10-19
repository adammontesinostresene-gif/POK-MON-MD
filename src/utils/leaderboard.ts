import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LeaderboardEntry {
  uid: string;
  name: string;
  rankPoints: number;
  leaderPokedexId: number;
}

const PLAYERS = 'players';

export const submitScore = async (
  uid: string,
  data: { name: string; rankPoints: number; leaderPokedexId: number }
): Promise<void> => {
  if (!db) return;
  await setDoc(doc(db, PLAYERS, uid), {
    name: data.name.slice(0, 20),
    rankPoints: Math.max(0, Math.floor(data.rankPoints)),
    leaderPokedexId: Math.floor(data.leaderPokedexId),
    updatedAt: serverTimestamp(),
  });
};

export const fetchLeaderboard = async (max = 50): Promise<LeaderboardEntry[]> => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, PLAYERS), orderBy('rankPoints', 'desc'), limit(max)));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      name: typeof data.name === 'string' ? data.name : 'Explorador',
      rankPoints: typeof data.rankPoints === 'number' ? data.rankPoints : 0,
      leaderPokedexId: typeof data.leaderPokedexId === 'number' ? data.leaderPokedexId : 25,
    };
  });
};
