import { Item, Move, Pokemon, PokemonType, StatusAilment, BattleStat } from '../types/game';
import { ABILITY_DATA, SPECIES_DATA, SpeciesAbility } from './speciesData';

export const ABILITY_CAPSULE_NAME = 'Cápsula Habilidad';

export const ABILITY_CAPSULE_TEMPLATE: Omit<Item, 'id' | 'count'> = {
  name: ABILITY_CAPSULE_NAME,
  category: 'special',
  description: 'Desbloquea la habilidad oculta de un Pokémon. Se usa desde la Gestión de Equipo.',
  effectType: 'unlock_ability',
  effectValue: 1,
  icon: '💊',
};

export const getSpeciesAbilities = (pokedexId: number): SpeciesAbility[] => {
  const list = SPECIES_DATA[pokedexId]?.abilities ?? [];
  // Some species repeat an ability as hidden; keep the first (unlocked) entry
  return list.filter((a, i) => list.findIndex((b) => b.id === a.id) === i);
};

export const getAbilityName = (id: string | undefined): string =>
  (id && ABILITY_DATA[id]?.name) || id || '—';

export const getAbilityDescription = (id: string | undefined): string =>
  (id && ABILITY_DATA[id]?.description) || '';

const isSelectable = (p: Pokemon, a: SpeciesAbility) => !a.hidden || !!p.hiddenAbilityUnlocked;

/** Ability currently active for this Pokémon (handles old saves that only stored the Spanish name). */
export const getAbilityId = (p: Pokemon): string | undefined => {
  const list = getSpeciesAbilities(p.pokedexId);
  if (list.length === 0) return p.abilityId;
  const byId = list.find((a) => a.id === p.abilityId && isSelectable(p, a));
  if (byId) return byId.id;
  const byName = list.find((a) => ABILITY_DATA[a.id]?.name === p.ability && isSelectable(p, a));
  if (byName) return byName.id;
  return (list.find((a) => !a.hidden) ?? list[0]).id;
};

export const withAbility = (p: Pokemon, abilityId: string | undefined = getAbilityId(p)): Pokemon =>
  abilityId ? { ...p, abilityId, ability: getAbilityName(abilityId) } : p;

/** Keeps the same kind of ability (normal slot or hidden) when evolving. */
export const getEvolvedAbilityId = (p: Pokemon, targetPokedexId: number): string | undefined => {
  const current = getSpeciesAbilities(p.pokedexId);
  const target = getSpeciesAbilities(targetPokedexId);
  if (target.length === 0) return undefined;
  const currentId = getAbilityId(p);
  const sameAbility = target.find((a) => a.id === currentId && isSelectable(p, a));
  if (sameAbility) return sameAbility.id;
  const wasHidden = current.find((a) => a.id === currentId)?.hidden;
  const targetHidden = target.find((a) => a.hidden);
  if (wasHidden && targetHidden && p.hiddenAbilityUnlocked) return targetHidden.id;
  const currentNormals = current.filter((a) => !a.hidden);
  const targetNormals = target.filter((a) => !a.hidden);
  const slot = Math.max(0, currentNormals.findIndex((a) => a.id === currentId));
  return (targetNormals[Math.min(slot, targetNormals.length - 1)] ?? target[0]).id;
};

/** Wild Pokémon get one of their regular abilities at random. */
export const randomWildAbilityId = (pokedexId: number): string | undefined => {
  const normals = getSpeciesAbilities(pokedexId).filter((a) => !a.hidden);
  return normals.length > 0 ? normals[Math.floor(Math.random() * normals.length)].id : undefined;
};

// ---------------------------------------------------------------------------
// Combat effects (keyed by PokéAPI slug)
// ---------------------------------------------------------------------------

type Ailment = Exclude<StatusAilment, 'none'>;

const PINCH_TYPES: Record<string, PokemonType> = {
  overgrow: 'Planta',
  blaze: 'Fuego',
  torrent: 'Agua',
  swarm: 'Bicho',
};

const TYPE_BOOSTS: Record<string, { type: PokemonType; mult: number }> = {
  transistor: { type: 'Eléctrico', mult: 1.3 },
  'dragons-maw': { type: 'Dragón', mult: 1.5 },
  steelworker: { type: 'Acero', mult: 1.5 },
  'rocky-payload': { type: 'Roca', mult: 1.5 },
  'water-bubble': { type: 'Agua', mult: 2 },
};

const TYPE_CONVERSIONS: Record<string, PokemonType> = {
  pixilate: 'Hada',
  aerilate: 'Volador',
  refrigerate: 'Hielo',
  galvanize: 'Eléctrico',
};

export type AbsorbEffect =
  | { kind: 'immune' }
  | { kind: 'heal' }
  | { kind: 'boost'; stat: BattleStat; stages: number };

export const ABSORB_ABILITIES: Record<string, { type: PokemonType; effect: AbsorbEffect }> = {
  levitate: { type: 'Tierra', effect: { kind: 'immune' } },
  'flash-fire': { type: 'Fuego', effect: { kind: 'immune' } },
  'water-absorb': { type: 'Agua', effect: { kind: 'heal' } },
  'dry-skin': { type: 'Agua', effect: { kind: 'heal' } },
  'volt-absorb': { type: 'Eléctrico', effect: { kind: 'heal' } },
  'earth-eater': { type: 'Tierra', effect: { kind: 'heal' } },
  'sap-sipper': { type: 'Planta', effect: { kind: 'boost', stat: 'attack', stages: 1 } },
  'lightning-rod': { type: 'Eléctrico', effect: { kind: 'boost', stat: 'spAttack', stages: 1 } },
  'storm-drain': { type: 'Agua', effect: { kind: 'boost', stat: 'spAttack', stages: 1 } },
  'motor-drive': { type: 'Eléctrico', effect: { kind: 'boost', stat: 'speed', stages: 1 } },
  'well-baked-body': { type: 'Fuego', effect: { kind: 'boost', stat: 'defense', stages: 2 } },
};

const AILMENT_IMMUNITIES: Record<string, Ailment[]> = {
  immunity: ['poison'],
  'pastel-veil': ['poison'],
  limber: ['paralysis'],
  insomnia: ['sleep'],
  'vital-spirit': ['sleep'],
  'sweet-veil': ['sleep'],
  'water-veil': ['burn'],
  'water-bubble': ['burn'],
  'thermal-exchange': ['burn'],
  'magma-armor': ['freeze'],
  'purifying-salt': ['poison', 'paralysis', 'burn', 'sleep', 'freeze'],
  comatose: ['poison', 'paralysis', 'burn', 'sleep', 'freeze'],
};

/** Abilities of the defender that may afflict an attacker using a physical move (30%). */
export const CONTACT_AILMENTS: Record<string, Ailment[]> = {
  static: ['paralysis'],
  'poison-point': ['poison'],
  'flame-body': ['burn'],
  'effect-spore': ['poison', 'paralysis', 'sleep'],
};

/** Abilities that hurt an attacker using a physical move (fraction of its max HP). */
export const CONTACT_RECOIL: Record<string, number> = {
  'rough-skin': 1 / 8,
  'iron-barbs': 1 / 8,
};

const STAT_DROP_BLOCKERS: Record<string, BattleStat[] | 'all'> = {
  'clear-body': 'all',
  'white-smoke': 'all',
  'full-metal-body': 'all',
  'hyper-cutter': ['attack'],
  'keen-eye': ['accuracy'],
  'big-pecks': ['defense'],
};

export const abilityConvertsMove = (abilityId: string | undefined, move: Move): Move => {
  const newType = abilityId ? TYPE_CONVERSIONS[abilityId] : undefined;
  if (!newType || move.type !== 'Normal' || move.power <= 0) return move;
  return { ...move, type: newType, power: Math.round(move.power * 1.2) };
};

export const abilityStab = (abilityId: string | undefined) => (abilityId === 'adaptability' ? 2 : 1.5);

export const abilityAttackMultiplier = (
  abilityId: string | undefined,
  attacker: Pokemon,
  move: Move,
  effectiveness: number,
  ailment: Ailment | undefined
): number => {
  if (!abilityId) return 1;
  const physical = move.category === 'physical';
  let mult = 1;
  if (PINCH_TYPES[abilityId] === move.type && attacker.stats.hp <= attacker.stats.maxHp / 3) mult *= 1.5;
  if (TYPE_BOOSTS[abilityId]?.type === move.type) mult *= TYPE_BOOSTS[abilityId].mult;
  if ((abilityId === 'huge-power' || abilityId === 'pure-power') && physical) mult *= 2;
  if ((abilityId === 'hustle' || abilityId === 'gorilla-tactics') && physical) mult *= 1.5;
  if (abilityId === 'technician' && move.power <= 60) mult *= 1.5;
  if (abilityId === 'guts' && ailment && physical) mult *= 1.5;
  if (abilityId === 'toxic-boost' && ailment === 'poison' && physical) mult *= 1.5;
  if (abilityId === 'flare-boost' && ailment === 'burn' && !physical) mult *= 1.5;
  if (abilityId === 'tinted-lens' && effectiveness > 0 && effectiveness < 1) mult *= 2;
  return mult;
};

export const abilityIgnoresBurn = (abilityId: string | undefined) => abilityId === 'guts';

export const abilityDefenseMultiplier = (
  abilityId: string | undefined,
  defender: Pokemon,
  move: Move,
  effectiveness: number,
  ailment: Ailment | undefined
): number => {
  if (!abilityId) return 1;
  const physical = move.category === 'physical';
  let mult = 1;
  if (abilityId === 'thick-fat' && (move.type === 'Fuego' || move.type === 'Hielo')) mult *= 0.5;
  if ((abilityId === 'heatproof' || abilityId === 'water-bubble') && move.type === 'Fuego') mult *= 0.5;
  if (['filter', 'solid-rock', 'prism-armor'].includes(abilityId) && effectiveness > 1) mult *= 0.75;
  if (['multiscale', 'shadow-shield'].includes(abilityId) && defender.stats.hp >= defender.stats.maxHp) mult *= 0.5;
  if (abilityId === 'fur-coat' && physical) mult *= 0.5;
  if (abilityId === 'ice-scales' && !physical) mult *= 0.5;
  if (abilityId === 'marvel-scale' && ailment && physical) mult /= 1.5;
  return mult;
};

/** Scrappy lets Normal and Fighting moves hit Ghost types. */
export const abilityIgnoresGhostImmunity = (abilityId: string | undefined, move: Move) =>
  abilityId === 'scrappy' && (move.type === 'Normal' || move.type === 'Lucha');

export const abilityCritChance = (attackerAbility: string | undefined, defenderAbility: string | undefined) =>
  defenderAbility === 'battle-armor' || defenderAbility === 'shell-armor'
    ? 0
    : attackerAbility === 'super-luck'
    ? 0.16
    : 0.08;

export const abilityCritMultiplier = (abilityId: string | undefined) => (abilityId === 'sniper' ? 2.25 : 1.5);

export const abilityAccuracyMultiplier = (abilityId: string | undefined, move: Move) =>
  abilityId === 'compound-eyes' ? 1.3 : abilityId === 'hustle' && move.category === 'physical' ? 0.8 : 1;

export const abilityAlwaysHits = (attackerAbility: string | undefined, defenderAbility: string | undefined) =>
  attackerAbility === 'no-guard' || defenderAbility === 'no-guard';

export const abilityPriority = (abilityId: string | undefined, move: Move) =>
  (abilityId === 'prankster' && move.category === 'status' ? 1 : 0) +
  (abilityId === 'triage' && move.healPercent ? 3 : 0);

export const abilitySpeedMultiplier = (abilityId: string | undefined, ailment: Ailment | undefined) =>
  abilityId === 'quick-feet' && ailment ? 1.5 : 1;

export const abilityIgnoresParalysisSlow = (abilityId: string | undefined) => abilityId === 'quick-feet';

export const abilitySecondaryChanceMultiplier = (abilityId: string | undefined) => (abilityId === 'serene-grace' ? 2 : 1);

export const abilityBlocksSecondary = (abilityId: string | undefined) => abilityId === 'shield-dust';

export const abilityBlocksAilment = (abilityId: string | undefined, ailment: Ailment) =>
  !!abilityId && (AILMENT_IMMUNITIES[abilityId]?.includes(ailment) ?? false);

export const abilityBlocksStatDrop = (abilityId: string | undefined, stat: BattleStat) => {
  const blocked = abilityId ? STAT_DROP_BLOCKERS[abilityId] : undefined;
  return blocked === 'all' || (blocked?.includes(stat) ?? false);
};

/** Simple doubles stat changes, Contrary inverts them. */
export const abilityStageFactor = (abilityId: string | undefined) =>
  abilityId === 'simple' ? 2 : abilityId === 'contrary' ? -1 : 1;

export const abilitySurvivesAtFullHp = (abilityId: string | undefined) => abilityId === 'sturdy';

/** Wonder Guard: only super-effective moves deal damage. */
export const abilityBlocksNonSuperEffective = (abilityId: string | undefined, effectiveness: number) =>
  abilityId === 'wonder-guard' && effectiveness <= 1;

/** Every ability with an effect implemented in combat. */
export const ABILITIES_WITH_EFFECT = new Set<string>([
  ...Object.keys(PINCH_TYPES),
  ...Object.keys(TYPE_BOOSTS),
  ...Object.keys(TYPE_CONVERSIONS),
  ...Object.keys(ABSORB_ABILITIES),
  ...Object.keys(AILMENT_IMMUNITIES),
  ...Object.keys(CONTACT_AILMENTS),
  ...Object.keys(CONTACT_RECOIL),
  ...Object.keys(STAT_DROP_BLOCKERS),
  'adaptability', 'huge-power', 'pure-power', 'hustle', 'gorilla-tactics', 'technician', 'guts',
  'toxic-boost', 'flare-boost', 'tinted-lens', 'thick-fat', 'heatproof', 'filter', 'solid-rock',
  'prism-armor', 'multiscale', 'shadow-shield', 'fur-coat', 'ice-scales', 'marvel-scale', 'scrappy',
  'battle-armor', 'shell-armor', 'super-luck', 'sniper', 'compound-eyes', 'no-guard', 'prankster',
  'triage', 'quick-feet', 'serene-grace', 'shield-dust', 'simple', 'contrary', 'sturdy', 'wonder-guard',
  'intimidate', 'speed-boost', 'poison-heal', 'magic-guard', 'shed-skin', 'moxie', 'poison-touch',
]);
