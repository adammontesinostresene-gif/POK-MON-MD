export type PokemonType =
  | 'Normal'
  | 'Fuego'
  | 'Agua'
  | 'Planta'
  | 'Eléctrico'
  | 'Hielo'
  | 'Lucha'
  | 'Veneno'
  | 'Tierra'
  | 'Volador'
  | 'Psíquico'
  | 'Bicho'
  | 'Roca'
  | 'Fantasma'
  | 'Dragón'
  | 'Acero'
  | 'Siniestro'
  | 'Hada';

export type MoveCategory = 'physical' | 'special' | 'status';

export type BattleStat = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed' | 'accuracy' | 'evasion';

export interface StatChange {
  stat: BattleStat;
  stages: number;
}

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number; // 0 for status
  accuracy: number; // percentage
  pp: number;
  maxPp: number;
  description: string;
  target?: 'enemy' | 'self' | 'all_enemies';
  statusEffect?: 'paralysis' | 'burn' | 'sleep' | 'poison' | 'freeze' | 'attack_boost' | 'defense_boost';
  statusChance?: number; // % chance to inflict statusEffect, 100 = always
  healPercent?: number;
  // Battle-only stat stage changes (reset after each floor battle)
  statChanges?: StatChange[];
  statTarget?: 'self' | 'target';
  statChance?: number; // % chance for damaging moves, 100 = always
}

export interface PokemonStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export type StatusAilment = 'none' | 'paralysis' | 'burn' | 'sleep' | 'poison' | 'freeze';

export interface Pokemon {
  id: string;
  pokedexId: number;
  name: string;
  level: number;
  exp: number;
  nextExp: number;
  types: PokemonType[];
  stats: PokemonStats;
  moves: Move[];
  status: StatusAilment;
  statusTurns: number;
  ability: string;
  spriteUrl: string;
  artworkUrl: string;
  iconUrl: string;
  description: string;
  // Chance (0-1) that this wild Pokémon asks to join after being defeated
  recruitRate?: number;
  // Every move learned during its life (kept across evolutions), equippable from the team screen
  learnedMoves?: Move[];
}

export type ItemCategory = 'food' | 'healing' | 'seed' | 'orb' | 'special';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  count: number;
  effectType: 'heal_hp' | 'restore_belly' | 'revive' | 'restore_pp' | 'boost_attack' | 'inflict_status' | 'escape';
  effectValue: number;
  icon: string;
}

export interface Dungeon {
  id: string;
  name: string;
  description: string;
  floorsCount: number;
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Épica';
  theme: 'forest' | 'cave' | 'volcano';
  bgImage: string;
  recommendedLevel: number;
  enemiesPool: string[]; // Pokemon IDs or templates
  enemyWeights?: Record<string, number>; // relative spawn weight per pool entry (default 1)
  enemyLevelRange?: [number, number]; // clamps wild enemy levels (not the boss)
  squadSizeOdds?: number[]; // chance of 1, 2, 3... enemies per battle; also disables Monster Houses
  bossId: string;
  bossLevel?: number; // defaults to recommendedLevel + 3
  bossCount?: number; // how many copies of the boss appear (default 1)
  rewards: {
    gold: number;
    exp: number;
    items: string[];
  };
}

export type FloorEventType =
  | 'combat'
  | 'decision'
  | 'chest'
  | 'spring'
  | 'monster_house'
  | 'kecleon'
  | 'item_choice'
  | 'boss';

export interface DecisionChoice {
  id: string;
  text: string;
  requirement?: {
    type?: PokemonType;
    minStat?: { stat: keyof PokemonStats; value: number };
    item?: string;
  };
  hint?: string;
  actionKey: 'risk_search' | 'rest_carefully' | 'give_berry' | 'force_lock' | 'avoid_trap' | 'buy_item' | 'steal_shop' | 'explore_tunnel' | 'choose_path';
}

export interface FloorEvent {
  floorNumber: number;
  type: FloorEventType;
  title: string;
  description: string;
  dialogueSpeaker?: string;
  speakerPortrait?: string;
  choices?: DecisionChoice[];
  enemy?: Pokemon;
  enemies?: Pokemon[];
  itemChoices?: Item[];
  reward?: {
    gold?: number;
    items?: Item[];
    message?: string;
  };
}

export interface RescueMission {
  id: string;
  title: string;
  clientPokemonName: string;
  clientPokedexId: number;
  targetPokemonName: string;
  dungeonId: string;
  targetFloor: number;
  rewardGold: number;
  rewardItem: string;
  difficulty: string;
  completed: boolean;
}

export type ViewScreen =
  | 'TITLE'
  | 'PERSONALITY_QUIZ'
  | 'HUB'
  | 'DUNGEON_EXPLORE'
  | 'COMBAT'
  | 'EVENT_DECISION'
  | 'TEAM_MANAGEMENT'
  | 'EVOLUTION'
  | 'BAG'
  | 'MISSIONS'
  | 'VICTORY'
  | 'GAME_OVER';
