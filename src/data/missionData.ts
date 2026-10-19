import { FloorEvent, Item, MissionKind, RescueMission } from '../types/game';
import { ABILITY_CAPSULE_TEMPLATE } from './abilities';
import { FLOOR_ITEM_POOL } from './eventData';
import { DUNGEONS, ORAN_BERRY, createSpeciesEnemy, getPmdPortraitUrl } from './pokemonData';
import { SPECIES_DATA } from './speciesData';

export const MISSION_BOARD_SIZE = 3;

export const MISSION_RANKS = ['E', 'D', 'C', 'B', 'A'];

// Personal belongings a client may lose inside a dungeon (story items, not added to the bag)
const LOST_BELONGINGS = [
  'Pañuelo de Seda',
  'Cinta Azul',
  'Lazo Rosa',
  'Cascabel Concha',
  'Collar de Perlas',
  'Bufanda Tejida',
  'Gafas Redondas',
  'Medallón Familiar',
  'Diario de Viaje',
  'Mapa Antiguo',
];

// Item rewards per difficulty (index = stars - 1)
const ITEM_REWARDS_BY_STARS: string[][] = [
  ['Baya Aranja', 'Manzana Grande'],
  ['Elixir', 'Semilla Sueño', 'Baya Aranja'],
  ['Semilla Revivir', 'Elixir'],
  ['Semilla Revivir', 'Fugaesfera'],
  [ABILITY_CAPSULE_TEMPLATE.name, 'Semilla Revivir'],
];

const REWARD_ITEM_TEMPLATES: Omit<Item, 'id' | 'count'>[] = [ORAN_BERRY, ...FLOOR_ITEM_POOL, ABILITY_CAPSULE_TEMPLATE];

export const createRewardItem = (name: string): Item | null => {
  const template = REWARD_ITEM_TEMPLATES.find((t) => t.name === name);
  return template ? { ...template, id: `mission_reward_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, count: 1 } : null;
};

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Builds a random mission. Clients and targets are always Pokémon the player has seen. */
export const generateMission = (seenIds: number[]): RescueMission | null => {
  const pool = seenIds.filter((id) => SPECIES_DATA[id]);
  if (pool.length === 0) return null;

  const dungeon = pick(DUNGEONS);
  // The last floor belongs to the boss, so missions happen before it
  const targetFloor = randInt(1, Math.max(1, dungeon.floorsCount - 1));
  const kind = pick<MissionKind>(['rescue', 'defeat', 'retrieve']);
  const clientPokedexId = pick(pool);
  const others = pool.filter((id) => id !== clientPokedexId);
  const targetPokedexId = kind === 'retrieve' ? clientPokedexId : pick(others.length > 0 ? others : pool);
  const targetCount = kind === 'defeat' ? randInt(1, 3) : 1;

  const baseLevel = dungeon.enemyLevelRange?.[1] ?? dungeon.recommendedLevel + 2;
  const targetLevel = baseLevel + Math.floor(targetFloor / 3) + (kind === 'defeat' ? 1 : 0);

  const score = dungeon.recommendedLevel / 2 + targetFloor / 2 + (kind === 'defeat' ? targetCount : 0);
  const stars = Math.max(1, Math.min(5, Math.ceil(score / 2)));

  const rankPoints = stars * 10 + (kind === 'defeat' ? 5 : 0);
  const reward: RescueMission['reward'] =
    Math.random() < 0.5
      ? { rankPoints, gold: stars * 120 + randInt(0, 5) * 10 }
      : { rankPoints, itemName: pick(ITEM_REWARDS_BY_STARS[stars - 1]) };

  return {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    clientPokedexId,
    clientName: SPECIES_DATA[clientPokedexId].name,
    targetPokedexId,
    targetName: SPECIES_DATA[targetPokedexId].name,
    targetCount,
    targetLevel,
    itemName: kind === 'retrieve' ? pick(LOST_BELONGINGS) : undefined,
    dungeonId: dungeon.id,
    dungeonName: dungeon.name,
    targetFloor,
    stars,
    reward,
  };
};

/** Fills the board up to MISSION_BOARD_SIZE missions. */
export const topUpMissions = (missions: RescueMission[], seenIds: number[]): RescueMission[] => {
  const next = [...missions];
  while (next.length < MISSION_BOARD_SIZE) {
    const mission = generateMission(seenIds);
    if (!mission) break;
    next.push(mission);
  }
  return next;
};

export const isValidMission = (m: unknown): m is RescueMission => {
  const mission = m as Partial<RescueMission> | null;
  return (
    !!mission &&
    typeof mission.id === 'string' &&
    (mission.kind === 'rescue' || mission.kind === 'defeat' || mission.kind === 'retrieve') &&
    typeof mission.targetFloor === 'number' &&
    typeof mission.stars === 'number' &&
    typeof mission.reward?.rankPoints === 'number' &&
    DUNGEONS.some((d) => d.id === mission.dungeonId)
  );
};

export const describeMission = (m: RescueMission): { title: string; request: string } => {
  const place = `el piso ${m.targetFloor} de ${m.dungeonName}`;
  if (m.kind === 'rescue') {
    return {
      title: `Rescatar a ${m.targetName}`,
      request: `"¡${m.targetName} se ha perdido en ${place}! Por favor, id a buscarle."`,
    };
  }
  if (m.kind === 'defeat') {
    return m.targetCount > 1
      ? {
          title: `Derrotar a una banda de ${m.targetCount} ${m.targetName}`,
          request: `"Una banda de ${m.targetCount} ${m.targetName} malvados está causando problemas en ${place}. ¡Dadles su merecido!"`,
        }
      : {
          title: `Derrotar al malvado ${m.targetName}`,
          request: `"Un ${m.targetName} malvado aterroriza a todo el que pasa por ${place}. ¡Detenedle!"`,
        };
  }
  return {
    title: `Recuperar: ${m.itemName}`,
    request: `"Se me cayó mi ${m.itemName} en ${place}. ¿Podríais traérmelo?"`,
  };
};

export const describeReward = (m: RescueMission): string =>
  [
    `${m.reward.rankPoints} pts. de rango`,
    m.reward.gold ? `${m.reward.gold} Pokécuartos` : null,
    m.reward.itemName ? m.reward.itemName : null,
  ]
    .filter(Boolean)
    .join(' + ');

/** Floor event that replaces the random one on the mission's target floor. */
export const createMissionEvent = (m: RescueMission, floorNumber: number): FloorEvent => {
  if (m.kind === 'defeat') {
    const enemies = Array.from({ length: m.targetCount }, (_, i) => {
      const villain = createSpeciesEnemy(m.targetPokedexId, m.targetLevel);
      villain.id = `mission_villain_${i}_${villain.id}`;
      return villain;
    });
    return {
      floorNumber,
      type: 'combat',
      missionId: m.id,
      title: `Piso ${floorNumber}: ¡Misión! ${m.targetCount > 1 ? 'La banda villana' : 'El villano'}`,
      description:
        m.targetCount > 1
          ? `¡Ahí está la banda de ${m.targetCount} ${m.targetName} que buscaba ${m.clientName}! Se ponen en guardia al veros.`
          : `¡Ahí está el ${m.targetName} malvado del que hablaba ${m.clientName}! No parece dispuesto a rendirse.`,
      enemy: enemies[0],
      enemies,
      dialogueSpeaker: m.targetName,
      speakerPortrait: getPmdPortraitUrl(m.targetPokedexId),
    };
  }
  if (m.kind === 'rescue') {
    return {
      floorNumber,
      type: 'mission',
      missionId: m.id,
      title: `Piso ${floorNumber}: ¡Misión! ${m.targetName} en apuros`,
      description: `Encuentras a ${m.targetName}, agotado y sin fuerzas para seguir. ${m.clientName} lleva mucho tiempo buscándole.`,
      dialogueSpeaker: m.targetName,
      speakerPortrait: getPmdPortraitUrl(m.targetPokedexId),
    };
  }
  return {
    floorNumber,
    type: 'mission',
    missionId: m.id,
    title: `Piso ${floorNumber}: ¡Misión! Un objeto perdido`,
    description: `En un rincón del piso brilla algo: ¡es el ${m.itemName} que perdió ${m.clientName}!`,
    dialogueSpeaker: m.clientName,
    speakerPortrait: getPmdPortraitUrl(m.clientPokedexId),
  };
};
