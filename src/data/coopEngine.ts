import { DecisionChoice, Dungeon, Item, Pokemon } from '../types/game';
import {
  generateEnemySquad,
  generateFloorEvent,
  generateRandomFloorItem,
  getRandomRecruit,
  getWildEnemiesCount,
} from './eventData';
import { ORAN_BERRY, addItem, bagSpace, normalizeItems } from './pokemonData';
import { createMissionEvent } from './missionData';
import { CoopGame, CoopParty, CoopResult, coopMemberId } from '../utils/coop';

// Host-side rules of a co-op expedition. Every function returns a new game state.

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const reviverSeed = (id: string): Item => ({
  id,
  name: 'Semilla Revivir',
  category: 'seed',
  description: 'Revive inmediatamente a un Pokémon caído.',
  count: 1,
  effectType: 'revive',
  effectValue: 100,
  icon: '🌰',
});

export const ITEM_SKIP_CHOICE = 'none';

const enterFloor = (game: CoopGame, dungeon: Dungeon, floor: number): CoopGame => {
  const g = clone(game);
  const mission = g.mission;
  g.event =
    mission && !g.missionDone && floor === mission.targetFloor && floor < dungeon.floorsCount
      ? createMissionEvent(mission, floor)
      : generateFloorEvent(dungeon, floor);
  g.floor = floor;
  g.eventSeq += 1;
  g.eventResolved = false;
  g.message = null;
  g.combat = null;
  g.belly = Math.max(0, g.belly - 6);
  // Starving hurts the first leader, as in single player
  if (g.belly === 0 && g.team[0]) g.team[0].stats.hp = Math.max(1, g.team[0].stats.hp - 5);
  return g;
};

export const createCoopGame = (party: CoopParty, dungeon: Dungeon): CoopGame => {
  const owners = party.memberUids.filter((uid) => party.members[uid]);
  const base: CoopGame = {
    version: 1,
    seed: `${party.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dungeonId: dungeon.id,
    mission: party.mission?.dungeonId === dungeon.id ? party.mission : null,
    owners,
    names: Object.fromEntries(owners.map((uid) => [uid, party.members[uid].name])),
    floor: 0,
    belly: 100,
    team: owners.map((uid) => ({ ...clone(party.members[uid].leader), id: coopMemberId(uid) })),
    inventory: normalizeItems(owners.flatMap((uid) => party.members[uid].items)),
    gold: owners.reduce((sum, uid) => sum + party.members[uid].gold, 0),
    event: null,
    eventSeq: 0,
    eventResolved: false,
    message: null,
    missionDone: false,
    combat: null,
    recruits: {},
    handledUses: {},
    contributions: Object.fromEntries(owners.map((uid) => [uid, normalizeItems(clone(party.members[uid].items))])),
    result: null,
    split: null,
  };
  return enterFloor(base, dungeon, 1);
};

export const startCombat = (game: CoopGame): CoopGame => ({
  ...clone(game),
  combat: { id: `${game.eventSeq}_${Math.random().toString(36).slice(2, 8)}`, rounds: [], decisions: {} },
});

const addRecruit = (g: CoopGame, uid: string, pokemon: Pokemon) => {
  g.recruits[uid] = [...(g.recruits[uid] ?? []), pokemon];
};

/** Most voted choice; ties go to the host's vote, otherwise to the first tied option. */
export const tallyVotes = (choiceIds: string[], votes: string[], hostVote: string | undefined): string => {
  const counts = new Map(choiceIds.map((id) => [id, 0]));
  votes.forEach((v) => counts.has(v) && counts.set(v, counts.get(v)! + 1));
  const best = Math.max(...counts.values());
  const tied = choiceIds.filter((id) => counts.get(id) === best);
  return hostVote && tied.includes(hostVote) ? hostVote : tied[0];
};

export const resolveChoice = (game: CoopGame, dungeon: Dungeon, choice: DecisionChoice, activeUids: string[]): CoopGame => {
  const g = clone(game);
  const floor = g.floor;

  if (choice.actionKey === 'choose_path') {
    const outcome = Math.floor(Math.random() * 3);
    if (outcome === 0) {
      const item = generateRandomFloorItem();
      if (bagSpace(g.inventory) > 0) {
        g.inventory = addItem(g.inventory, item);
        g.message = `En el camino encontrasteis ${item.icon} ${item.name}.`;
      } else {
        g.message = 'Encontrasteis un objeto, pero la mochila está llena y tuvisteis que dejarlo.';
      }
      g.eventResolved = true;
      return g;
    }
    if (outcome === 1) {
      const reward = 50 + floor * 12;
      g.gold += reward;
      g.message = `Encontrasteis ${reward} Pokécuartos en el camino.`;
      g.eventResolved = true;
      return g;
    }
    const baseLevel = dungeon.recommendedLevel + Math.floor((floor - 1) / 2);
    const enemies = generateEnemySquad(dungeon, baseLevel, getWildEnemiesCount(false, dungeon.squadSizeOdds));
    const lead = enemies[0];
    g.event = {
      floorNumber: floor,
      type: 'combat',
      title: `Piso ${floor}: Encuentro en el camino`,
      description: `Un ${lead.name} y su grupo os cortan el paso.`,
      enemy: lead,
      enemies,
      dialogueSpeaker: lead.name,
      speakerPortrait: lead.artworkUrl,
    };
    g.eventSeq += 1;
    g.message = null;
    return startCombat(g);
  }

  if (choice.actionKey === 'give_berry') {
    const idx = g.inventory.findIndex((it) => it.name === ORAN_BERRY.name && it.count > 0);
    if (idx !== -1) {
      g.inventory[idx].count -= 1;
      g.inventory = g.inventory.filter((it) => it.count > 0);
      const friend = getRandomRecruit();
      const uid = pick(activeUids);
      addRecruit(g, uid, friend);
      g.message = `¡Le disteis una Baya Aranja! ${friend.name} recuperó su energía y se unirá al campamento de ${g.names[uid]}.`;
    } else {
      g.message = 'No quedaban Bayas Aranja en la mochila. El Pokémon os agradeció la intención y se marchó.';
    }
  } else if (choice.actionKey === 'explore_tunnel') {
    if (Math.random() < 0.65) {
      const loot = 60 + floor * 15;
      g.gold += loot;
      g.message = `¡Al final del túnel hallasteis un alijo con ${loot} Pokécuartos!`;
    } else {
      g.team = g.team.map((p) => ({ ...p, stats: { ...p.stats, hp: Math.max(1, p.stats.hp - 8) } }));
      g.message = '¡Una trampa de rocas se activó! El equipo recibió 8 puntos de daño.';
    }
  } else if (choice.actionKey === 'force_lock') {
    const bonus = 90 + floor * 12;
    g.gold += bonus;
    if (bagSpace(g.inventory) > 0) {
      g.inventory = addItem(g.inventory, reviverSeed(`reviver_reward_${Date.now()}`));
      g.message = `¡Las runas abrieron una cámara secreta! Encontrasteis ${bonus} Pokécuartos y una Semilla Revivir.`;
    } else {
      g.message = `¡Las runas abrieron una cámara secreta! Encontrasteis ${bonus} Pokécuartos, pero la mochila estaba llena.`;
    }
  } else if (choice.actionKey === 'rest_carefully') {
    g.belly = Math.min(100, g.belly + 25);
    g.message = 'Recolectasteis bayas y descansasteis un momento. ¡+25 de Hambre!';
  } else if (choice.actionKey === 'buy_item') {
    const isOran = choice.id.includes('oran');
    const price = isOran ? 80 : 220;
    if (bagSpace(g.inventory) === 0) {
      g.message = 'Kecleon miró la mochila: "¡Ahí no cabe nada más!"';
    } else if (g.gold < price) {
      g.message = 'Kecleon sonrió apenado: "No tenéis suficientes Pokécuartos..."';
    } else {
      g.gold -= price;
      g.inventory = addItem(
        g.inventory,
        isOran ? { ...ORAN_BERRY, id: `oran_shop_${Date.now()}`, count: 1 } : reviverSeed(`reviver_shop_${Date.now()}`)
      );
      g.message = `Kecleon hizo una reverencia: "¡Gracias por vuestra compra de ${isOran ? 'Baya Aranja' : 'Semilla Revivir'}!"`;
    }
  } else {
    g.message = 'Avanzasteis con prudencia hacia las escaleras sin contratiempos.';
  }

  g.eventResolved = true;
  return g;
};

export const pickFloorItem = (game: CoopGame, itemId: string): CoopGame => {
  const g = clone(game);
  const item = g.event?.itemChoices?.find((it) => it.id === itemId);
  if (item && bagSpace(g.inventory) > 0) {
    g.inventory = addItem(g.inventory, item);
    g.message = `¡Guardasteis ${item.icon} ${item.name} en la mochila!`;
  } else if (item) {
    g.message = `Elegisteis ${item.name}, pero la mochila está llena y tuvisteis que dejarlo.`;
  } else {
    g.message = 'Decidisteis no llevaros nada y seguisteis adelante.';
  }
  g.eventResolved = true;
  return g;
};

export const drinkSpring = (game: CoopGame): CoopGame => {
  const g = clone(game);
  g.team = g.team.map((p) => ({
    ...p,
    stats: { ...p.stats, hp: p.stats.maxHp },
    moves: p.moves.map((m) => ({ ...m, pp: m.maxPp })),
  }));
  g.belly = Math.min(100, g.belly + 40);
  g.message = '¡Las aguas termales han sanado todas las heridas y restaurado todos los PP!';
  g.eventResolved = true;
  return g;
};

export const openChest = (game: CoopGame): CoopGame => {
  const g = clone(game);
  const bounty = g.event?.reward?.gold ?? 75 + g.floor * 20;
  g.gold += bounty;
  g.message = `¡Abristeis el cofre y contenía ${bounty} Pokécuartos!`;
  g.eventResolved = true;
  return g;
};

export const completeMissionEvent = (game: CoopGame): CoopGame => {
  const g = clone(game);
  const m = g.mission;
  g.missionDone = true;
  g.eventResolved = true;
  g.message = !m
    ? null
    : m.kind === 'rescue'
    ? `¡Habéis rescatado a ${m.targetName}! ${m.clientName} dará la recompensa al volver a la aldea.`
    : `¡Habéis recuperado el ${m.itemName}! Se lo devolveréis a ${m.clientName} al volver a la aldea.`;
  return g;
};

export const finishGame = (game: CoopGame, result: CoopResult, activeUids: string[]): CoopGame => {
  const g = clone(game);
  g.result = result;
  g.combat = null;
  const receivers = g.owners.filter((uid) => activeUids.includes(uid));
  const split: NonNullable<CoopGame['split']> = Object.fromEntries(receivers.map((uid) => [uid, { gold: 0, items: [] as Item[] }]));
  const keepsLoot = result === 'cleared' || result === 'returned' || result === 'escaped';
  if (keepsLoot && receivers.length > 0) {
    const share = Math.floor(g.gold / receivers.length);
    receivers.forEach((uid, i) => {
      split[uid].gold = share + (i === 0 ? g.gold - share * receivers.length : 0);
    });

    // Leftover units of what each player brought go back to them; the rest counts as new loot
    const remaining = new Map(g.inventory.map((it) => [it.name, it.count]));
    const templates = new Map(g.inventory.map((it) => [it.name, it]));
    const pending = new Map(
      receivers.map((uid) => [uid, new Map((g.contributions?.[uid] ?? []).map((it) => [it.name, it.count]))])
    );
    let returnedAny = true;
    while (returnedAny) {
      returnedAny = false;
      for (const uid of receivers) {
        for (const [name, owed] of pending.get(uid)!) {
          const left = remaining.get(name) ?? 0;
          if (owed <= 0 || left <= 0) continue;
          split[uid].items = addItem(split[uid].items, { ...templates.get(name)!, count: 1 });
          remaining.set(name, left - 1);
          pending.get(uid)!.set(name, owed - 1);
          returnedAny = true;
        }
      }
    }

    // New loot is shuffled and dealt in turns so everyone gets the same amount when possible
    const newUnits: Item[] = [];
    for (const [name, count] of remaining) {
      for (let k = 0; k < count; k++) newUnits.push({ ...templates.get(name)!, count: 1 });
    }
    for (let i = newUnits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newUnits[i], newUnits[j]] = [newUnits[j], newUnits[i]];
    }
    const offset = Math.floor(Math.random() * receivers.length);
    newUnits.forEach((unit, i) => {
      const uid = receivers[(offset + i) % receivers.length];
      split[uid].items = addItem(split[uid].items, unit);
    });
  }
  g.split = split;
  return g;
};

export const nextFloor = (game: CoopGame, dungeon: Dungeon, activeUids: string[]): CoopGame =>
  game.floor >= dungeon.floorsCount ? finishGame(game, 'cleared', activeUids) : enterFloor(game, dungeon, game.floor + 1);

export const applyCombatVictory = (
  game: CoopGame,
  dungeon: Dungeon,
  activeUids: string[],
  team: Pokemon[],
  inventory: Item[],
  goldGained: number,
  droppedItem: Item | undefined,
  recruit: Pokemon | undefined,
  recruiterUid: string | undefined
): CoopGame => {
  const g = clone(game);
  g.team = clone(team);
  g.inventory = clone(inventory);
  g.gold += goldGained;
  if (droppedItem && bagSpace(g.inventory) > 0) g.inventory = addItem(g.inventory, droppedItem);
  if (recruit && recruiterUid) addRecruit(g, recruiterUid, clone(recruit));
  g.combat = null;

  const missionFight = Boolean(g.event?.missionId && g.mission);
  if (missionFight) {
    g.missionDone = true;
    g.eventResolved = true;
    const m = g.mission!;
    g.message = `¡Habéis derrotado a ${m.targetCount > 1 ? `la banda de ${m.targetName}` : m.targetName}! ${m.clientName} dará la recompensa al volver a la aldea.`;
    return g;
  }
  return nextFloor(g, dungeon, activeUids);
};

/** Bag item used outside battle by any member (`targetIdx` is a team slot). */
export const applyItemOutsideCombat = (
  game: CoopGame,
  itemId: string,
  targetIdx: number,
  moveIdx: number | undefined,
  userName: string,
  activeUids: string[]
): CoopGame => {
  const g = clone(game);
  const item = g.inventory.find((it) => it.id === itemId && it.count > 0);
  if (!item) return g;
  const target = g.team[targetIdx];
  if (item.effectType === 'heal_hp' && (!target || target.stats.hp <= 0)) return g;
  if (!['restore_belly', 'heal_hp', 'restore_pp', 'revive', 'escape'].includes(item.effectType)) return g;
  if (item.effectType === 'restore_pp' && (moveIdx === undefined || !target?.moves[moveIdx])) return g;

  g.inventory = g.inventory.map((it) => (it.id === item.id ? { ...it, count: it.count - 1 } : it)).filter((it) => it.count > 0);

  if (item.effectType === 'escape') {
    g.message = `${userName} usó ${item.name}. ¡El equipo sale de la mazmorra con todo el botín!`;
    return finishGame(g, 'escaped', activeUids);
  }
  if (item.effectType === 'restore_belly') {
    g.belly = Math.min(100, g.belly + item.effectValue);
    g.message = `${userName} repartió ${item.name}. ¡+${item.effectValue} de Hambre!`;
  } else if (item.effectType === 'heal_hp') {
    target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + item.effectValue);
    g.message = `${userName} usó ${item.name} en ${target.name}.`;
  } else if (item.effectType === 'restore_pp') {
    target.moves = target.moves.map((m, i) => (i === moveIdx ? { ...m, pp: Math.min(m.maxPp, m.pp + item.effectValue) } : m));
    g.message = `${userName} usó ${item.name} en ${target.moves[moveIdx!].name} de ${target.name}.`;
  } else if (item.effectType === 'revive') {
    target.stats.hp = target.stats.maxHp;
    target.status = 'none';
    target.statusTurns = 0;
    g.message = `${userName} usó ${item.name} en ${target.name}.`;
  }
  return g;
};
