import { Pokemon, PokemonType, PokemonStats, Dungeon, Item, RescueMission, Move } from '../types/game';
import { LEARNSETS, LEARNSET_MOVES } from './learnsets';
import { SPECIES_DATA } from './speciesData';

// PMD Sprite Repository (SpriteCollab / PMDCollab)
export const formatDex4Digits = (pokedexId: number): string => {
  return String(pokedexId).padStart(4, '0');
};

export const getPmdPortraitUrl = (pokedexId: number, emotion: string = 'Normal'): string => {
  const padded = formatDex4Digits(pokedexId);
  return `https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/${padded}/${emotion}.png`;
};

export const getPmdSpriteSheetUrl = (pokedexId: number, animType: string = 'Walk'): string => {
  const padded = formatDex4Digits(pokedexId);
  return `https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/${padded}/${animType}-Anim.png`;
};

// PMD Repository image getters (Exclusively PMD Repository)
export const getPokemonSprite = (pokedexId: number): string => {
  return getPmdPortraitUrl(pokedexId);
};

export const getPokemonStaticSprite = (pokedexId: number): string => {
  return getPmdPortraitUrl(pokedexId);
};

export const getPokemonArtwork = (pokedexId: number): string => {
  return getPmdPortraitUrl(pokedexId, 'Normal');
};

// Type Effectiveness Matrix (Attacking Type -> Defending Type -> Multiplier)
export const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Eléctrico: {
    Agua: 2.0,
    Volador: 2.0,
    Planta: 0.5,
    Eléctrico: 0.5,
    Dragón: 0.5,
    Tierra: 0.0,
  },
  Fuego: {
    Planta: 2.0,
    Hielo: 2.0,
    Bicho: 2.0,
    Acero: 2.0,
    Fuego: 0.5,
    Agua: 0.5,
    Roca: 0.5,
    Dragón: 0.5,
  },
  Agua: {
    Fuego: 2.0,
    Tierra: 2.0,
    Roca: 2.0,
    Agua: 0.5,
    Planta: 0.5,
    Dragón: 0.5,
  },
  Planta: {
    Agua: 2.0,
    Tierra: 2.0,
    Roca: 2.0,
    Fuego: 0.5,
    Planta: 0.5,
    Veneno: 0.5,
    Volador: 0.5,
    Bicho: 0.5,
    Dragón: 0.5,
    Acero: 0.5,
  },
  Normal: {
    Roca: 0.5,
    Fantasma: 0.0,
    Acero: 0.5,
  },
  Lucha: {
    Normal: 2.0,
    Hielo: 2.0,
    Roca: 2.0,
    Siniestro: 2.0,
    Acero: 2.0,
    Veneno: 0.5,
    Volador: 0.5,
    Psíquico: 0.5,
    Bicho: 0.5,
    Hada: 0.5,
    Fantasma: 0.0,
  },
  Volador: {
    Planta: 2.0,
    Lucha: 2.0,
    Bicho: 2.0,
    Eléctrico: 0.5,
    Roca: 0.5,
    Acero: 0.5,
  },
  Veneno: {
    Planta: 2.0,
    Hada: 2.0,
    Veneno: 0.5,
    Tierra: 0.5,
    Roca: 0.5,
    Fantasma: 0.5,
    Acero: 0.0,
  },
  Tierra: {
    Fuego: 2.0,
    Eléctrico: 2.0,
    Veneno: 2.0,
    Roca: 2.0,
    Acero: 2.0,
    Planta: 0.5,
    Bicho: 0.5,
    Volador: 0.0,
  },
  Roca: {
    Fuego: 2.0,
    Hielo: 2.0,
    Volador: 2.0,
    Bicho: 2.0,
    Lucha: 0.5,
    Tierra: 0.5,
    Acero: 0.5,
  },
  Bicho: {
    Planta: 2.0,
    Psíquico: 2.0,
    Siniestro: 2.0,
    Fuego: 0.5,
    Lucha: 0.5,
    Veneno: 0.5,
    Volador: 0.5,
    Fantasma: 0.5,
    Acero: 0.5,
    Hada: 0.5,
  },
  Fantasma: {
    Psíquico: 2.0,
    Fantasma: 2.0,
    Siniestro: 0.5,
    Normal: 0.0,
  },
  Acero: {
    Hielo: 2.0,
    Roca: 2.0,
    Hada: 2.0,
    Fuego: 0.5,
    Agua: 0.5,
    Eléctrico: 0.5,
    Acero: 0.5,
  },
  Hielo: {
    Planta: 2.0,
    Tierra: 2.0,
    Volador: 2.0,
    Dragón: 2.0,
    Fuego: 0.5,
    Agua: 0.5,
    Hielo: 0.5,
    Acero: 0.5,
  },
  Psíquico: {
    Lucha: 2.0,
    Veneno: 2.0,
    Psíquico: 0.5,
    Acero: 0.5,
    Siniestro: 0.0,
  },
  Dragón: {
    Dragón: 2.0,
    Acero: 0.5,
    Hada: 0.0,
  },
  Siniestro: {
    Psíquico: 2.0,
    Fantasma: 2.0,
    Lucha: 0.5,
    Siniestro: 0.5,
    Hada: 0.5,
  },
  Hada: {
    Lucha: 2.0,
    Dragón: 2.0,
    Siniestro: 2.0,
    Fuego: 0.5,
    Veneno: 0.5,
    Acero: 0.5,
  },
};

// EXP needed to go from `level` to `level + 1` (quadratic curve: ~4 fights per level at any stage)
export const getExpToNextLevel = (level: number): number => 20 + 4 * level * level;

export const getTypeEffectiveness = (atkType: PokemonType, defTypes: PokemonType[]): number => {
  let mult = 1.0;
  for (const defType of defTypes) {
    const mod = TYPE_CHART[atkType]?.[defType];
    if (mod !== undefined) {
      mult *= mod;
    }
  }
  return mult;
};

export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  Eléctrico: { bg: 'bg-amber-500', text: 'text-amber-950', border: 'border-amber-300' },
  Fuego: { bg: 'bg-red-500', text: 'text-red-950', border: 'border-red-300' },
  Agua: { bg: 'bg-blue-500', text: 'text-blue-950', border: 'border-blue-300' },
  Planta: { bg: 'bg-emerald-500', text: 'text-emerald-950', border: 'border-emerald-300' },
  Normal: { bg: 'bg-stone-400', text: 'text-stone-950', border: 'border-stone-300' },
  Lucha: { bg: 'bg-orange-700', text: 'text-orange-100', border: 'border-orange-400' },
  Volador: { bg: 'bg-sky-400', text: 'text-sky-950', border: 'border-sky-200' },
  Veneno: { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-300' },
  Tierra: { bg: 'bg-yellow-700', text: 'text-yellow-100', border: 'border-yellow-500' },
  Roca: { bg: 'bg-stone-600', text: 'text-stone-100', border: 'border-stone-400' },
  Bicho: { bg: 'bg-lime-600', text: 'text-lime-950', border: 'border-lime-300' },
  Fantasma: { bg: 'bg-indigo-800', text: 'text-indigo-100', border: 'border-indigo-400' },
  Acero: { bg: 'bg-slate-400', text: 'text-slate-950', border: 'border-slate-300' },
  Hielo: { bg: 'bg-cyan-300', text: 'text-cyan-950', border: 'border-cyan-100' },
  Psíquico: { bg: 'bg-pink-500', text: 'text-pink-950', border: 'border-pink-300' },
  Dragón: { bg: 'bg-violet-700', text: 'text-violet-100', border: 'border-violet-400' },
  Siniestro: { bg: 'bg-neutral-800', text: 'text-neutral-100', border: 'border-neutral-500' },
  Hada: { bg: 'bg-pink-300', text: 'text-pink-950', border: 'border-pink-200' },
};

// Official base stats per species: [PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad]
const BASE_STATS: Record<number, [number, number, number, number, number, number]> = {
  1: [45, 49, 49, 65, 65, 45], // Bulbasaur
  2: [60, 62, 63, 80, 80, 60], // Ivysaur
  3: [80, 82, 83, 100, 100, 80], // Venusaur
  4: [39, 52, 43, 60, 50, 65], // Charmander
  5: [58, 64, 58, 80, 65, 80], // Charmeleon
  6: [78, 84, 78, 109, 85, 100], // Charizard
  7: [44, 48, 65, 50, 64, 43], // Squirtle
  8: [59, 63, 80, 65, 80, 58], // Wartortle
  9: [79, 83, 100, 85, 105, 78], // Blastoise
  10: [45, 30, 35, 20, 20, 45], // Caterpie
  11: [50, 20, 55, 25, 25, 30], // Metapod
  12: [60, 45, 50, 90, 80, 70], // Butterfree
  13: [40, 35, 30, 20, 20, 50], // Weedle
  14: [45, 25, 50, 25, 25, 35], // Kakuna
  15: [65, 90, 40, 45, 80, 75], // Beedrill
  16: [40, 45, 40, 35, 35, 56], // Pidgey
  17: [63, 60, 55, 50, 50, 71], // Pidgeotto
  18: [83, 80, 75, 70, 70, 101], // Pidgeot
  19: [30, 56, 35, 25, 35, 72], // Rattata
  22: [65, 90, 65, 61, 61, 100], // Fearow
  25: [35, 55, 40, 50, 50, 90], // Pikachu
  26: [60, 90, 55, 90, 80, 110], // Raichu
  35: [70, 45, 48, 60, 65, 35], // Clefairy
  39: [115, 45, 20, 45, 25, 20], // Jigglypuff
  41: [40, 45, 35, 30, 40, 55], // Zubat
  42: [75, 80, 70, 65, 75, 90], // Golbat
  43: [45, 50, 55, 75, 65, 30], // Oddish
  44: [60, 65, 70, 85, 75, 40], // Gloom
  45: [75, 80, 85, 110, 90, 50], // Vileplume
  50: [10, 55, 25, 35, 45, 95], // Diglett
  66: [70, 80, 50, 35, 35, 35], // Machop
  67: [80, 100, 70, 50, 60, 45], // Machoke
  68: [90, 130, 80, 65, 85, 55], // Machamp
  69: [50, 75, 35, 70, 30, 40], // Bellsprout
  70: [65, 90, 50, 85, 45, 55], // Weepinbell
  71: [80, 105, 65, 100, 70, 70], // Victreebel
  74: [40, 80, 100, 30, 30, 20], // Geodude
  75: [55, 95, 115, 45, 45, 35], // Graveler
  76: [80, 120, 130, 55, 65, 45], // Golem
  81: [25, 35, 70, 95, 55, 45], // Magnemite
  92: [30, 35, 30, 100, 35, 80], // Gastly
  93: [45, 50, 45, 115, 55, 95], // Haunter
  94: [60, 65, 60, 130, 75, 110], // Gengar
  95: [35, 45, 160, 30, 45, 70], // Onix
  125: [65, 83, 57, 95, 85, 105], // Electabuzz
  133: [55, 55, 50, 45, 65, 55], // Eevee
  134: [130, 65, 60, 110, 95, 65], // Vaporeon
  135: [65, 65, 60, 110, 95, 130], // Jolteon
  136: [65, 130, 60, 95, 110, 65], // Flareon
  145: [90, 90, 85, 125, 90, 100], // Zapdos
  155: [39, 52, 43, 60, 50, 65], // Cyndaquil
  156: [58, 64, 58, 80, 65, 80], // Quilava
  157: [78, 84, 78, 109, 85, 100], // Typhlosion
  165: [40, 20, 30, 40, 80, 55], // Ledyba
  169: [85, 90, 80, 70, 80, 130], // Crobat
  191: [30, 30, 30, 30, 30, 30], // Sunkern
  401: [37, 25, 41, 25, 41, 25], // Kricketot
  504: [45, 55, 39, 35, 39, 42], // Patrat
  700: [95, 65, 65, 110, 130, 60], // Sylveon
  942: [60, 78, 60, 40, 51, 51], // Maschiff
  20: [55, 81, 60, 50, 70, 97], // Raticate
  166: [55, 35, 50, 55, 110, 85], // Ledian
  402: [77, 85, 51, 55, 51, 65], // Kricketune
  505: [60, 85, 69, 60, 69, 77], // Watchog
  192: [75, 75, 55, 105, 85, 30], // Sunflora
  36: [95, 70, 73, 95, 90, 60], // Clefable
  40: [140, 70, 45, 85, 50, 45], // Wigglytuff
  82: [50, 60, 95, 120, 70, 70], // Magneton
  462: [70, 70, 115, 130, 90, 60], // Magnezone
  51: [35, 100, 50, 50, 70, 120], // Dugtrio
  152: [45, 49, 65, 49, 65, 45], // Chikorita
  158: [50, 65, 64, 44, 48, 43], // Totodile
  252: [40, 45, 35, 65, 55, 70], // Treecko
  255: [45, 60, 40, 70, 50, 45], // Torchic
  258: [50, 70, 50, 50, 50, 40], // Mudkip
  387: [55, 68, 64, 45, 55, 31], // Turtwig
  390: [44, 58, 44, 58, 44, 61], // Chimchar
  393: [53, 51, 53, 61, 56, 40], // Piplup
  495: [45, 45, 55, 45, 55, 63], // Snivy
  498: [65, 63, 45, 45, 45, 45], // Tepig
  501: [55, 55, 45, 63, 45, 45], // Oshawott
  650: [56, 61, 65, 48, 45, 38], // Chespin
  653: [40, 45, 40, 62, 60, 60], // Fennekin
  656: [41, 56, 40, 62, 44, 71], // Froakie
  722: [68, 55, 55, 50, 50, 42], // Rowlet
  725: [45, 65, 40, 60, 40, 70], // Litten
  728: [50, 54, 54, 66, 56, 40], // Popplio
  810: [50, 65, 50, 40, 40, 65], // Grookey
  813: [50, 71, 40, 40, 40, 69], // Scorbunny
  816: [50, 40, 40, 70, 40, 70], // Sobble
  906: [40, 61, 54, 45, 45, 65], // Sprigatito
  909: [67, 45, 59, 63, 40, 36], // Fuecoco
  912: [55, 65, 45, 50, 45, 50], // Quaxly
};

/** Main-series stat formula without IVs/EVs/natures. Null if the species has no base stats. */
export const calculateStats = (pokedexId: number, level: number): PokemonStats | null => {
  const base = SPECIES_DATA[pokedexId]?.baseStats ?? BASE_STATS[pokedexId];
  if (!base) return null;
  const [hp, atk, def, spa, spd, spe] = base;
  const other = (b: number) => Math.floor((2 * b * level) / 100) + 5;
  const maxHp = Math.floor((2 * hp * level) / 100) + level + 10;
  return {
    hp: maxHp,
    maxHp,
    attack: other(atk),
    defense: other(def),
    spAttack: other(spa),
    spDefense: other(spd),
    speed: other(spe),
  };
};

/** Recomputes stats from official bases, keeping the same amount of HP lost. */
export const applyOfficialStats = (pokemon: Pokemon): Pokemon => {
  const stats = calculateStats(pokemon.pokedexId, pokemon.level);
  if (!stats) return pokemon;
  const missingHp = Math.max(0, pokemon.stats.maxHp - pokemon.stats.hp);
  const hp = pokemon.stats.hp <= 0 ? 0 : Math.max(1, stats.maxHp - missingHp);
  return { ...pokemon, stats: { ...stats, hp } };
};

const cloneMove = (slug: string): Move => ({ ...LEARNSET_MOVES[slug] });

/**
 * Official moveset for a species at a level: the 4 most recently learned level-up moves,
 * preferring damaging moves on ties and always keeping at least one damaging move.
 * Null if the species has no learnset.
 */
export const getMovesForLevel = (pokedexId: number, level: number): Move[] | null => {
  const learnset = LEARNSETS[pokedexId];
  if (!learnset || learnset.length === 0) return null;

  const known = learnset.filter((e) => e.level <= level);
  const slugs = [...new Set(known.map((e) => e.move))];
  const lastLevel = (slug: string) => Math.max(...known.filter((e) => e.move === slug).map((e) => e.level));
  const ranked = slugs.sort((a, b) => {
    const byLevel = lastLevel(b) - lastLevel(a);
    if (byLevel !== 0) return byLevel;
    return (LEARNSET_MOVES[b].power > 0 ? 1 : 0) - (LEARNSET_MOVES[a].power > 0 ? 1 : 0);
  });

  const picked = ranked.slice(0, 4);
  if (!picked.some((s) => LEARNSET_MOVES[s].power > 0)) {
    const strongest = ranked
      .filter((s) => LEARNSET_MOVES[s].power > 0)
      .sort((a, b) => LEARNSET_MOVES[b].power - LEARNSET_MOVES[a].power)[0];
    if (strongest) picked[Math.min(picked.length, 3)] = strongest;
  }

  return picked.reverse().map(cloneMove);
};

const uniqueByName = (moves: Move[]): Move[] => {
  const seen = new Set<string>();
  return moves.filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)));
};

/** Adds moves to the Pokémon's lifetime move history (kept across evolutions). */
export const rememberMoves = (pokemon: Pokemon, moves: Move[]): Pokemon => ({
  ...pokemon,
  learnedMoves: uniqueByName([...(pokemon.learnedMoves ?? pokemon.moves), ...moves]).map((m) => ({
    ...m,
    pp: m.maxPp,
  })),
});

/** Replaces a Pokémon's moves with its official moveset for its current level. */
export const applyOfficialMoves = (pokemon: Pokemon): Pokemon => {
  const moves = getMovesForLevel(pokemon.pokedexId, pokemon.level);
  return moves ? { ...pokemon, moves, learnedMoves: moves.map((m) => ({ ...m })) } : pokemon;
};

/**
 * Every move this Pokémon can equip: all moves learned in its life plus the level-up moves
 * its current species knows up to its level (like the Move Reminder).
 */
export const getMovePool = (pokemon: Pokemon): Move[] => {
  const speciesMoves = (LEARNSETS[pokemon.pokedexId] ?? [])
    .filter((e) => e.level <= pokemon.level)
    .map((e) => cloneMove(e.move));
  return uniqueByName([...pokemon.moves, ...(pokemon.learnedMoves ?? []), ...speciesMoves]);
};

/**
 * Learns the official level-up moves for the current level into free slots.
 * Moves that don't fit (4 already known) are returned as `pending` so the player can choose.
 */
export const learnLevelUpMoves = (
  pokemon: Pokemon
): { pokemon: Pokemon; learned: string[]; pending: Move[] } => {
  const learnset = LEARNSETS[pokemon.pokedexId] ?? [];
  const moves = [...pokemon.moves];
  const newlyLearned: Move[] = [];
  const pending: Move[] = [];
  for (const entry of learnset.filter((e) => e.level === pokemon.level && e.level > 0)) {
    const move = cloneMove(entry.move);
    if (moves.some((m) => m.name === move.name)) continue;
    if (moves.length < 4) {
      moves.push(move);
      newlyLearned.push(move);
    } else {
      pending.push(move);
    }
  }
  return {
    pokemon: rememberMoves({ ...pokemon, moves }, newlyLearned),
    learned: newlyLearned.map((m) => m.name),
    pending,
  };
};

/** Swaps an equipped move for a newly learned one and records it in the move history. */
export const replaceMove = (pokemon: Pokemon, oldMoveName: string, newMove: Move): Pokemon =>
  rememberMoves(
    { ...pokemon, moves: pokemon.moves.map((m) => (m.name === oldMoveName ? { ...newMove } : m)) },
    [newMove]
  );

/** Every possible starter from the personality test (Gen 1-9 starters + Pikachu and Eevee). */
export const STARTERS: { pokedexId: number; name: string; types: PokemonType[]; ability: string; description: string }[] = [
  { pokedexId: 1, name: 'Bulbasaur', types: ['Planta', 'Veneno'], ability: 'Espesura', description: 'Lleva una semilla en el lomo que crece con él. Tranquilo y digno de confianza.' },
  { pokedexId: 4, name: 'Charmander', types: ['Fuego'], ability: 'Mar Llamas', description: 'La llama de su cola refleja su estado de ánimo. Valiente y apasionado.' },
  { pokedexId: 7, name: 'Squirtle', types: ['Agua'], ability: 'Torrente', description: 'Se refugia en su caparazón y contraataca con chorros de agua. Travieso y leal.' },
  { pokedexId: 25, name: 'Pikachu', types: ['Eléctrico'], ability: 'Elec. Estática', description: 'Sus mejillas acumulan electricidad. Alegre y lleno de energía.' },
  { pokedexId: 133, name: 'Eevee', types: ['Normal'], ability: 'Adaptable', description: 'Su código genético inestable le permite adaptarse a todo. Curioso y versátil.' },
  { pokedexId: 152, name: 'Chikorita', types: ['Planta'], ability: 'Espesura', description: 'Desprende un dulce aroma de la hoja de su cabeza. Amable y cariñoso.' },
  { pokedexId: 155, name: 'Cyndaquil', types: ['Fuego'], ability: 'Mar Llamas', description: 'Tímido, pero las llamas de su lomo arden con fuerza cuando se enfada.' },
  { pokedexId: 158, name: 'Totodile', types: ['Agua'], ability: 'Torrente', description: 'Muerde todo lo que se mueve con sus potentes mandíbulas. Juguetón e impulsivo.' },
  { pokedexId: 252, name: 'Treecko', types: ['Planta'], ability: 'Espesura', description: 'Sereno y seguro de sí mismo. Nunca pierde la calma.' },
  { pokedexId: 255, name: 'Torchic', types: ['Fuego'], ability: 'Mar Llamas', description: 'Lleva una llama en su interior que lo mantiene cálido. Cariñoso y entusiasta.' },
  { pokedexId: 258, name: 'Mudkip', types: ['Agua'], ability: 'Torrente', description: 'Su aleta percibe todo lo que le rodea. Tranquilo y muy perceptivo.' },
  { pokedexId: 387, name: 'Turtwig', types: ['Planta'], ability: 'Espesura', description: 'Su caparazón es de tierra endurecida. Paciente y constante.' },
  { pokedexId: 390, name: 'Chimchar', types: ['Fuego'], ability: 'Mar Llamas', description: 'Ágil y travieso, trepa por los riscos con facilidad.' },
  { pokedexId: 393, name: 'Piplup', types: ['Agua'], ability: 'Torrente', description: 'Muy orgulloso, odia aceptar ayuda de los demás.' },
  { pokedexId: 495, name: 'Snivy', types: ['Planta'], ability: 'Espesura', description: 'Elegante y astuto, siempre mantiene la compostura.' },
  { pokedexId: 498, name: 'Tepig', types: ['Fuego'], ability: 'Mar Llamas', description: 'Expulsa fuego por el hocico. Glotón y de buen corazón.' },
  { pokedexId: 501, name: 'Oshawott', types: ['Agua'], ability: 'Torrente', description: 'Usa su vieira para luchar. Valiente aunque algo despistado.' },
  { pokedexId: 650, name: 'Chespin', types: ['Planta'], ability: 'Espesura', description: 'Curioso por naturaleza; endurece sus púas para protegerse.' },
  { pokedexId: 653, name: 'Fennekin', types: ['Fuego'], ability: 'Mar Llamas', description: 'Intuitivo y reflexivo, mordisquea ramitas para cargar energía.' },
  { pokedexId: 656, name: 'Froakie', types: ['Agua'], ability: 'Torrente', description: 'Despreocupado pero siempre alerta. Se protege con burbujas.' },
  { pokedexId: 722, name: 'Rowlet', types: ['Planta', 'Volador'], ability: 'Espesura', description: 'Vuela en silencio y ataca por sorpresa. Tranquilo y dormilón.' },
  { pokedexId: 725, name: 'Litten', types: ['Fuego'], ability: 'Mar Llamas', description: 'Solitario e independiente, no muestra sus sentimientos.' },
  { pokedexId: 728, name: 'Popplio', types: ['Agua'], ability: 'Torrente', description: 'Trabajador y artista, crea globos de agua con su nariz.' },
  { pokedexId: 810, name: 'Grookey', types: ['Planta'], ability: 'Espesura', description: 'Travieso y lleno de curiosidad, toca su ramita sin parar.' },
  { pokedexId: 813, name: 'Scorbunny', types: ['Fuego'], ability: 'Mar Llamas', description: 'Siempre corriendo de un lado a otro. Activo y competitivo.' },
  { pokedexId: 816, name: 'Sobble', types: ['Agua'], ability: 'Torrente', description: 'Muy sensible y tímido; se vuelve invisible al tocar el agua.' },
  { pokedexId: 906, name: 'Sprigatito', types: ['Planta'], ability: 'Espesura', description: 'Caprichoso y coqueto, le encanta que le presten atención.' },
  { pokedexId: 909, name: 'Fuecoco', types: ['Fuego'], ability: 'Mar Llamas', description: 'Despreocupado y tranquilo, va a su propio ritmo.' },
  { pokedexId: 912, name: 'Quaxly', types: ['Agua'], ability: 'Torrente', description: 'Ordenado y serio, cuida mucho su aspecto.' },
];

export const createStarter = (pokedexId: number): Pokemon => {
  const species = STARTERS.find((s) => s.pokedexId === pokedexId) ?? STARTERS[0];
  const level = 5;
  const stats = calculateStats(species.pokedexId, level)!;
  return applyOfficialMoves({
    id: `${species.name.toLowerCase()}_hero`,
    pokedexId: species.pokedexId,
    name: species.name,
    level,
    exp: 0,
    nextExp: getExpToNextLevel(level),
    types: species.types,
    stats,
    moves: [],
    status: 'none',
    statusTurns: 0,
    ability: species.ability,
    spriteUrl: getPokemonSprite(species.pokedexId),
    artworkUrl: getPokemonArtwork(species.pokedexId),
    iconUrl: getPokemonStaticSprite(species.pokedexId),
    description: species.description,
  });
};

// Starter Hero Pikachu
export const createPikachuStarter = (): Pokemon => applyOfficialMoves(applyOfficialStats({
  id: 'pikachu_hero',
  pokedexId: 25,
  name: 'Pikachu',
  level: 5,
  exp: 0,
  nextExp: 100,
  types: ['Eléctrico'],
  stats: {
    hp: 42,
    maxHp: 42,
    attack: 24,
    defense: 18,
    spAttack: 26,
    spDefense: 20,
    speed: 35,
  },
  ability: 'Elec. Estática',
  status: 'none',
  statusTurns: 0,
  spriteUrl: getPokemonSprite(25),
  artworkUrl: getPokemonArtwork(25),
  iconUrl: getPokemonStaticSprite(25),
  description: 'El intrépido líder del Equipo Rescate. Sus mejillas acumulan electricidad estática de alto voltaje.',
  moves: [
    {
      id: 'move_thunder_shock',
      name: 'Impactrueno',
      type: 'Eléctrico',
      category: 'special',
      power: 40,
      accuracy: 100,
      pp: 25,
      maxPp: 25,
      description: 'Lanza una descarga eléctrica que puede paralizar al objetivo.',
      statusEffect: 'paralysis',
    },
    {
      id: 'move_quick_attack',
      name: 'Ataque Rápido',
      type: 'Normal',
      category: 'physical',
      power: 40,
      accuracy: 100,
      pp: 30,
      maxPp: 30,
      description: 'Se abalanza velozmente contra el enemigo con prioridad.',
    },
    {
      id: 'move_thunder_wave',
      name: 'Onda Trueno',
      type: 'Eléctrico',
      category: 'status',
      power: 0,
      accuracy: 90,
      pp: 20,
      maxPp: 20,
      description: 'Emite una débil onda electromagnética que paraliza siempre.',
      statusEffect: 'paralysis',
    },
    {
      id: 'move_iron_tail',
      name: 'Cola Férrea',
      type: 'Acero',
      category: 'physical',
      power: 65,
      accuracy: 85,
      pp: 15,
      maxPp: 15,
      description: 'Golpea fuertemente al rival con su endurecida cola.',
    },
  ],
}));

// Initial Reserve Pokemons for the user to try Drag and Drop team modifications
const RESERVE_TEMPLATES: Pokemon[] = [
  {
    id: 'charmander_recruit',
    pokedexId: 4,
    name: 'Charmander',
    level: 5,
    exp: 0,
    nextExp: 100,
    types: ['Fuego'],
    stats: {
      hp: 39,
      maxHp: 39,
      attack: 26,
      defense: 19,
      spAttack: 28,
      spDefense: 21,
      speed: 30,
    },
    ability: 'Mar Llamas',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(4),
    artworkUrl: getPokemonArtwork(4),
    iconUrl: getPokemonStaticSprite(4),
    description: 'La llama de su cola indica su salud y vitalidad. Valiente y decidido.',
    moves: [
      {
        id: 'move_ember',
        name: 'Ascuas',
        type: 'Fuego',
        category: 'special',
        power: 40,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Dispara pequeñas brasas ardientes que pueden causar quemaduras.',
        statusEffect: 'burn',
      },
      {
        id: 'move_scratch',
        name: 'Arañazo',
        type: 'Normal',
        category: 'physical',
        power: 40,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Araña al objetivo con afiladas garras.',
      },
      {
        id: 'move_smokescreen',
        name: 'Pantalla Humo',
        type: 'Normal',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Reduce la precisión del enemigo con una nube de humo denso.',
      },
      {
        id: 'move_dragon_breath',
        name: 'Dragoaliento',
        type: 'Dragón',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Exhala un aliento destructivo con poder místico.',
        statusEffect: 'paralysis',
      },
    ],
  },
  {
    id: 'bulbasaur_recruit',
    pokedexId: 1,
    name: 'Bulbasaur',
    level: 5,
    exp: 0,
    nextExp: 100,
    types: ['Planta', 'Veneno'],
    stats: {
      hp: 45,
      maxHp: 45,
      attack: 23,
      defense: 23,
      spAttack: 29,
      spDefense: 28,
      speed: 22,
    },
    ability: 'Espesura',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(1),
    artworkUrl: getPokemonArtwork(1),
    iconUrl: getPokemonStaticSprite(1),
    description: 'Lleva una semilla en su lomo que crece con él absorbiendo los rayos solares.',
    moves: [
      {
        id: 'move_vine_whip',
        name: 'Látigo Cepa',
        type: 'Planta',
        category: 'physical',
        power: 45,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Azota al enemigo con finas cepas vegetales.',
      },
      {
        id: 'move_tackle',
        name: 'Placaje',
        type: 'Normal',
        category: 'physical',
        power: 40,
        accuracy: 100,
        pp: 35,
        maxPp: 35,
        description: 'Una embestida de cuerpo entero.',
      },
      {
        id: 'move_sleep_powder',
        name: 'Somnífero',
        type: 'Planta',
        category: 'status',
        power: 0,
        accuracy: 75,
        pp: 15,
        maxPp: 15,
        description: 'Esparce esporas que sumen al enemigo en un profundo sueño.',
        statusEffect: 'sleep',
      },
      {
        id: 'move_synthesis',
        name: 'Síntesis',
        type: 'Planta',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Restaura una gran porción de sus puntos de salud.',
        healPercent: 50,
      },
    ],
  },
  {
    id: 'squirtle_recruit',
    pokedexId: 7,
    name: 'Squirtle',
    level: 5,
    exp: 0,
    nextExp: 100,
    types: ['Agua'],
    stats: {
      hp: 44,
      maxHp: 44,
      attack: 22,
      defense: 30,
      spAttack: 24,
      spDefense: 28,
      speed: 21,
    },
    ability: 'Torrente',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(7),
    artworkUrl: getPokemonArtwork(7),
    iconUrl: getPokemonStaticSprite(7),
    description: 'Su caparazón redondeado reduce la resistencia al agua y ofrece gran protección.',
    moves: [
      {
        id: 'move_water_gun',
        name: 'Pistola Agua',
        type: 'Agua',
        category: 'special',
        power: 40,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Dispara un potente chorro de agua a presión.',
      },
      {
        id: 'move_bubble',
        name: 'Burbuja',
        type: 'Agua',
        category: 'special',
        power: 35,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Lanza ráfagas de burbujas que pueden reducir la velocidad del rival.',
      },
      {
        id: 'move_withdraw',
        name: 'Refugio',
        type: 'Agua',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Se esconde en su caparazón aumentando su Defensa física.',
        statusEffect: 'defense_boost',
      },
      {
        id: 'move_bite',
        name: 'Mordisco',
        type: 'Siniestro',
        category: 'physical',
        power: 60,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Muerde con afilados colmillos.',
      },
    ],
  },
];
export const INITIAL_RESERVES: Pokemon[] = RESERVE_TEMPLATES.map((p) => applyOfficialMoves(applyOfficialStats(p)));

// Potential Recruits that can appear or join during events
const RECRUIT_TEMPLATES: Pokemon[] = [
  {
    id: 'eevee_wild',
    pokedexId: 133,
    name: 'Eevee',
    level: 6,
    exp: 0,
    nextExp: 140,
    types: ['Normal'],
    stats: {
      hp: 48,
      maxHp: 48,
      attack: 26,
      defense: 25,
      spAttack: 24,
      spDefense: 30,
      speed: 28,
    },
    ability: 'Adaptable',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(133),
    artworkUrl: getPokemonArtwork(133),
    iconUrl: getPokemonStaticSprite(133),
    description: 'Posee un ADN inestable que le permite evolucionar en múltiples formas.',
    moves: [
      {
        id: 'move_swift',
        name: 'Rapidez',
        type: 'Normal',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Lanza estrellas de energía que nunca fallan.',
      },
      {
        id: 'move_quick_atk',
        name: 'Ataque Rápido',
        type: 'Normal',
        category: 'physical',
        power: 40,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Embestida fugaz con máxima agilidad.',
      },
      {
        id: 'move_bite_eevee',
        name: 'Mordisco',
        type: 'Siniestro',
        category: 'physical',
        power: 60,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Muerde al rival con determinación.',
      },
      {
        id: 'move_sand_attack',
        name: 'Ataque Arena',
        type: 'Tierra',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Lanza arena a los ojos para desorientar.',
      },
    ],
  },
  {
    id: 'cyndaquil_wild',
    pokedexId: 155,
    name: 'Cyndaquil',
    level: 6,
    exp: 0,
    nextExp: 140,
    types: ['Fuego'],
    stats: {
      hp: 42,
      maxHp: 42,
      attack: 25,
      defense: 22,
      spAttack: 31,
      spDefense: 25,
      speed: 32,
    },
    ability: 'Mar Llamas',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(155),
    artworkUrl: getPokemonArtwork(155),
    iconUrl: getPokemonStaticSprite(155),
    description: 'Es tímido y suele enroscarse. Si se sobresalta, las llamas de su lomo arden con furia.',
    moves: [
      {
        id: 'move_flame_wheel',
        name: 'Rueda Fuego',
        type: 'Fuego',
        category: 'physical',
        power: 60,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Se envuelve en fuego y arremete contra el enemigo.',
      },
      {
        id: 'move_ember_cynd',
        name: 'Ascuas',
        type: 'Fuego',
        category: 'special',
        power: 40,
        accuracy: 100,
        pp: 25,
        maxPp: 25,
        description: 'Brasas brillantes.',
        statusEffect: 'burn',
      },
      {
        id: 'move_leer',
        name: 'Malicioso',
        type: 'Normal',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Intimida al oponente para bajar su defensa.',
      },
      {
        id: 'move_swift_cynd',
        name: 'Rapidez',
        type: 'Normal',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Estrellas mágicas.',
      },
    ],
  },
];
export const EXTRA_RECRUITS: Pokemon[] = RECRUIT_TEMPLATES.map((p) => applyOfficialMoves(applyOfficialStats(p)));

// Dungeon Templates
export const DUNGEONS: Dungeon[] = [
  {
    id: 'bosquejo_tutorial',
    name: 'Bosquejo Tutorial',
    description: 'Un bosque tranquilo e inofensivo, ideal para dar tus primeros pasos. Abundan los Pokémon tipo Normal, Bicho y Planta.',
    floorsCount: 5,
    difficulty: 'Fácil',
    theme: 'forest',
    bgImage: '/src/assets/images/pmd_dungeon_forest_1792068605705.jpg',
    recommendedLevel: 2,
    enemiesPool: ['rattata', 'caterpie', 'ledyba', 'kricketot', 'patrat', 'sunkern'],
    bossId: 'rattata',
    bossLevel: 3,
    bossCount: 3,
    rewards: {
      gold: 350,
      exp: 150,
      items: ['Baya Aranja', 'Manzana Grande', 'Semilla Revivir'],
    },
  },
  {
    id: 'arroyo_corriente',
    name: 'Arroyo Corriente',
    description: 'Un arroyo de aguas cristalinas entre cascadas y riscos. Abundan los Pokémon tipo Agua y Bicho; dicen que un Psyduck con dolor de cabeza vigila el final del cauce.',
    floorsCount: 7,
    difficulty: 'Fácil',
    theme: 'forest',
    bgImage: '/src/assets/images/fe575cb3f1ded6d8c94a1275c2e6e044.jpg',
    recommendedLevel: 3,
    enemiesPool: ['lotad', 'wooper', 'sentret', 'tarountula', 'surskit', 'magikarp'],
    // Magikarp is rare: ~5% of spawns
    enemyWeights: { magikarp: 0.25 },
    enemyLevelRange: [3, 5],
    bossId: 'boss_psyduck',
    bossLevel: 9,
    rewards: {
      gold: 600,
      exp: 350,
      items: ['Baya Aranja', 'Elixir', 'Semilla Revivir'],
    },
  },
  {
    id: 'cueva_estruendo',
    name: 'Cueva Resonante',
    description: 'Cavernas subterráneas iluminadas por cristales cian. Hogar de Pokémon tipo Roca, Tierra y Eléctrico.',
    floorsCount: 7,
    difficulty: 'Media',
    theme: 'cave',
    bgImage: '/src/assets/images/pmd_dungeon_cave_1792068605494.jpg',
    recommendedLevel: 8,
    enemiesPool: ['geodude', 'zubat', 'machop', 'magnemite', 'diglett', 'clefairy'],
    bossId: 'boss_onix',
    rewards: {
      gold: 900,
      exp: 600,
      items: ['Semilla Fuerza', 'Baya Meloc', 'Orbe Escape'],
    },
  },
  {
    id: 'pico_tempestad',
    name: 'Pico de la Tempestad',
    description: 'Una cordillera azotada por tormentas legendarias. Arriba aguarda el rey del trueno.',
    floorsCount: 10,
    difficulty: 'Difícil',
    theme: 'cave',
    bgImage: '/src/assets/images/pmd_dungeon_cave_1792068605494.jpg',
    recommendedLevel: 12,
    enemiesPool: ['electabuzz', 'graveler', 'haunter', 'fearow', 'raichu'],
    bossId: 'boss_zapdos',
    rewards: {
      gold: 2500,
      exp: 1800,
      items: ['Semilla Revivir', 'Cinta Heroica', 'Max Elixir'],
    },
  },
];

// Official Move Types and Stats Database
export const MOVE_TYPE_DATABASE: Record<
  string,
  {
    type: PokemonType;
    category: 'physical' | 'special' | 'status';
    power: number;
    accuracy: number;
    description: string;
  }
> = {
  // Volador
  'Tornado': { type: 'Volador', category: 'special', power: 40, accuracy: 100, description: 'Genera un torbellino de viento cortante.' },
  'Pico Taladro': { type: 'Volador', category: 'physical', power: 80, accuracy: 100, description: 'Ataca con el pico girando a gran velocidad.' },
  'Ataque Ala': { type: 'Volador', category: 'physical', power: 60, accuracy: 100, description: 'Golpea al objetivo batiendo las alas con fuerza.' },
  'Picotazo': { type: 'Volador', category: 'physical', power: 35, accuracy: 100, description: 'Pica al enemigo con un pico afilado.' },
  'Vendaval': { type: 'Volador', category: 'special', power: 110, accuracy: 70, description: 'Envuelve al enemigo en un tifón descomunal.' },

  // Veneno
  'Picotazo Ven.': { type: 'Veneno', category: 'physical', power: 35, accuracy: 100, description: 'Clava un aguijón tóxico que puede envenenar.' },
  'Picotazo Venenoso': { type: 'Veneno', category: 'physical', power: 35, accuracy: 100, description: 'Clava un aguijón tóxico que puede envenenar.' },
  'Ácido': { type: 'Veneno', category: 'special', power: 40, accuracy: 100, description: 'Rocía un líquido corrosivo que daña y reduce defensas.' },
  'Bomba Lodo': { type: 'Veneno', category: 'special', power: 90, accuracy: 100, description: 'Dispara lodo tóxico con gran fuerza.' },
  'Colmillo Veneno': { type: 'Veneno', category: 'physical', power: 50, accuracy: 100, description: 'Muerde con colmillos rezumantes de veneno.' },
  'Veneno X': { type: 'Veneno', category: 'physical', power: 70, accuracy: 100, description: 'Cuchillada venenosa en aspa.' },

  // Bicho
  'Disparo Demora': { type: 'Bicho', category: 'status', power: 0, accuracy: 95, description: 'Lanza hilos pegajosos que reducen la velocidad del rival.' },
  'Viento Plata': { type: 'Bicho', category: 'special', power: 60, accuracy: 100, description: 'Bate sus alas creando un viento de escamas brillantes.' },
  'Chupavidas': { type: 'Bicho', category: 'physical', power: 50, accuracy: 100, description: 'Drena salud del enemigo para recuperarse.' },
  'Picadura': { type: 'Bicho', category: 'physical', power: 60, accuracy: 100, description: 'Muerde con mandíbulas de insecto.' },
  'Doble Ataque': { type: 'Bicho', category: 'physical', power: 55, accuracy: 100, description: 'Clava sus aguijones en rápida sucesión.' },

  // Normal
  'Placaje': { type: 'Normal', category: 'physical', power: 40, accuracy: 100, description: 'Una embestida de cuerpo entero.' },
  'Ataque Rápido': { type: 'Normal', category: 'physical', power: 40, accuracy: 100, description: 'Ataque veloz con prioridad.' },
  'Arañazo': { type: 'Normal', category: 'physical', power: 40, accuracy: 100, description: 'Araña al objetivo con afiladas garras.' },
  'Repetición': { type: 'Normal', category: 'physical', power: 35, accuracy: 90, description: 'Oprime al enemigo entre sus anillos.' },
  'Atadura': { type: 'Normal', category: 'physical', power: 35, accuracy: 85, description: 'Inmoviliza al rival con ataduras.' },
  'Supersónico': { type: 'Normal', category: 'status', power: 0, accuracy: 80, description: 'Emite ondas sonoras desconcertantes.' },
  'Malicioso': { type: 'Normal', category: 'status', power: 0, accuracy: 100, description: 'Intimida al rival para bajar su Defensa.' },
  'Fortaleza': { type: 'Normal', category: 'status', power: 0, accuracy: 100, description: 'Aumenta la Defensa.' },
  'Gruñido': { type: 'Normal', category: 'status', power: 0, accuracy: 100, description: 'Gruñe de forma adorable para bajar el Ataque del rival.' },
  'Desarrollo': { type: 'Normal', category: 'status', power: 0, accuracy: 100, description: 'Hace crecer su cuerpo para aumentar su poder.' },
  'Cara Susto': { type: 'Normal', category: 'status', power: 0, accuracy: 100, description: 'Pone una cara aterradora que reduce mucho la Velocidad.' },

  // Planta
  'Absorber': { type: 'Planta', category: 'special', power: 35, accuracy: 100, description: 'Drena energía vegetal del enemigo.' },
  'Látigo Cepa': { type: 'Planta', category: 'physical', power: 45, accuracy: 100, description: 'Azota con fuertes lianas de espinas.' },
  'Somnífero': { type: 'Planta', category: 'status', power: 0, accuracy: 75, description: 'Esparce esporas que inducen el sueño.' },

  // Roca & Tierra
  'Lanzarrocas': { type: 'Roca', category: 'physical', power: 50, accuracy: 90, description: 'Lanza rocas pequeñas contra el rival.' },
  'Lanza Rocas': { type: 'Roca', category: 'physical', power: 50, accuracy: 90, description: 'Lanza rocas pequeñas contra el rival.' },
  'Tumba Rocas': { type: 'Roca', category: 'physical', power: 60, accuracy: 95, description: 'Atrapa y aplasta al enemigo bajo peñascos.' },
  'Terremoto': { type: 'Tierra', category: 'physical', power: 100, accuracy: 100, description: 'Sacude la corteza terrestre provocando gran devastación.' },
  'Ataque Arena': { type: 'Tierra', category: 'status', power: 0, accuracy: 100, description: 'Lanza arena a los ojos para bajar precisión.' },

  // Eléctrico
  'Impactrueno': { type: 'Eléctrico', category: 'special', power: 40, accuracy: 100, description: 'Descarga eléctrica concentrada.' },
  'Puño Trueno': { type: 'Eléctrico', category: 'physical', power: 75, accuracy: 100, description: 'Golpea con un puño envuelto en rayos.' },
  'Chispazo': { type: 'Eléctrico', category: 'special', power: 80, accuracy: 100, description: 'Una descarga eléctrica radial.' },
  'Trueno': { type: 'Eléctrico', category: 'special', power: 110, accuracy: 70, description: 'Invoca un rayo fulminante desde el cielo.' },
  'Onda Trueno': { type: 'Eléctrico', category: 'status', power: 0, accuracy: 90, description: 'Lanza una débil onda eléctrica que paraliza.' },
  'Rayo': { type: 'Eléctrico', category: 'special', power: 90, accuracy: 100, description: 'Poderoso relámpago con posibilidad de parálisis.' },

  // Fantasma & Siniestro
  'Tinieblas': { type: 'Fantasma', category: 'special', power: 50, accuracy: 100, description: 'Genera un espejismo oscuro aterrador.' },
  'Rayo Confuso': { type: 'Fantasma', category: 'status', power: 0, accuracy: 100, description: 'Un rayo siniestro que desconcierta la mente.' },
  'Mordisco': { type: 'Siniestro', category: 'physical', power: 60, accuracy: 100, description: 'Muerde con afilados colmillos sombríos.' },

  // Lucha & Psíquico
  'Golpe Kárate': { type: 'Lucha', category: 'physical', power: 50, accuracy: 100, description: 'Golpe seco con la mano con alta probabilidad de crítico.' },
  'Confusión': { type: 'Psíquico', category: 'special', power: 50, accuracy: 100, description: 'Ataque mental que puede confundir.' },
  'Agilidad': { type: 'Psíquico', category: 'status', power: 0, accuracy: 100, description: 'Relaja el cuerpo y dobla la velocidad.' },

  // Hada
  'Viento Feérico': { type: 'Hada', category: 'special', power: 40, accuracy: 100, description: 'Desata un viento mágico de polvo de hadas.' },
  'Beso Drenaje': { type: 'Hada', category: 'special', power: 50, accuracy: 100, description: 'Un beso que absorbe la energía del rival.' },
  'Brillo Mágico': { type: 'Hada', category: 'special', power: 80, accuracy: 100, description: 'Emite un destello de luz deslumbrante.' },
  'Fuerza Lunar': { type: 'Hada', category: 'special', power: 95, accuracy: 100, description: 'Invoca el poder de la luna contra el objetivo.' },
  'Carantoña': { type: 'Hada', category: 'physical', power: 90, accuracy: 90, description: 'Juega con el rival de forma adorable pero contundente.' },
  'Encanto': { type: 'Hada', category: 'status', power: 0, accuracy: 100, description: 'Mira al rival con ternura para reducir mucho su Ataque.' },
  'Canto': { type: 'Normal', category: 'status', power: 0, accuracy: 55, description: 'Una dulce melodía que adormece al rival.' },
  'Destructor': { type: 'Normal', category: 'physical', power: 40, accuracy: 100, description: 'Golpea con la palma de la mano.' },
};

/** Normalizes and safely retrieves move information from MOVE_TYPE_DATABASE */
export const getMoveFromDb = (mName: string) => {
  if (MOVE_TYPE_DATABASE[mName]) return MOVE_TYPE_DATABASE[mName];
  const cleaned = mName.toLowerCase().trim().replace(/[.\-_]/g, '');
  for (const [key, val] of Object.entries(MOVE_TYPE_DATABASE)) {
    if (key.toLowerCase().trim().replace(/[.\-_]/g, '') === cleaned) {
      return val;
    }
  }
  if (cleaned.includes('tornado')) {
    return { type: 'Volador' as PokemonType, category: 'special' as const, power: 40, accuracy: 100, description: 'Genera un torbellino de viento cortante.' };
  }
  if (cleaned.includes('picotazoven') || cleaned.includes('picotazovene')) {
    return { type: 'Veneno' as PokemonType, category: 'physical' as const, power: 35, accuracy: 100, description: 'Clava un aguijón tóxico que puede envenenar.' };
  }
  if (cleaned.includes('picotazo')) {
    return { type: 'Volador' as PokemonType, category: 'physical' as const, power: 35, accuracy: 100, description: 'Pica al enemigo con un pico afilado.' };
  }
  return undefined;
};

// Enemy generator helper
export const createWildEnemy = (enemyType: string, level: number): Pokemon => {
  const configs: Record<string, { pokedexId: number; name: string; types: PokemonType[]; hp: number; atk: number; def: number; spa: number; spd: number; spe: number; moves: string[]; recruitRate?: number }> = {
    // Bosquejo Tutorial roster
    rattata: {
      pokedexId: 19,
      name: 'Rattata',
      types: ['Normal'],
      hp: 30,
      atk: 18,
      def: 13,
      spa: 10,
      spd: 13,
      spe: 26,
      moves: ['Placaje', 'Ataque Rápido'],
      recruitRate: 0.25,
    },
    ledyba: {
      pokedexId: 165,
      name: 'Ledyba',
      types: ['Bicho', 'Volador'],
      hp: 32,
      atk: 12,
      def: 14,
      spa: 15,
      spd: 22,
      spe: 20,
      moves: ['Placaje', 'Supersónico'],
      recruitRate: 0.25,
    },
    kricketot: {
      pokedexId: 401,
      name: 'Kricketot',
      types: ['Bicho'],
      hp: 30,
      atk: 12,
      def: 18,
      spa: 10,
      spd: 18,
      spe: 12,
      moves: ['Placaje', 'Gruñido'],
      recruitRate: 0.25,
    },
    patrat: {
      pokedexId: 504,
      name: 'Patrat',
      types: ['Normal'],
      hp: 34,
      atk: 18,
      def: 14,
      spa: 12,
      spd: 14,
      spe: 18,
      moves: ['Placaje', 'Malicioso', 'Mordisco'],
      recruitRate: 0.25,
    },
    sunkern: {
      pokedexId: 191,
      name: 'Sunkern',
      types: ['Planta'],
      hp: 28,
      atk: 12,
      def: 13,
      spa: 15,
      spd: 13,
      spe: 10,
      moves: ['Absorber', 'Desarrollo'],
      recruitRate: 0.25,
    },
    caterpie: {
      pokedexId: 10,
      name: 'Caterpie',
      types: ['Bicho'],
      hp: 30,
      atk: 14,
      def: 16,
      spa: 12,
      spd: 12,
      spe: 18,
      moves: ['Disparo Demora', 'Placaje'],
      recruitRate: 0.25,
    },
    pidgey: {
      pokedexId: 16,
      name: 'Pidgey',
      types: ['Normal', 'Volador'],
      hp: 34,
      atk: 18,
      def: 16,
      spa: 16,
      spd: 16,
      spe: 24,
      moves: ['Tornado', 'Ataque Rápido'],
    },
    weedle: {
      pokedexId: 13,
      name: 'Weedle',
      types: ['Bicho', 'Veneno'],
      hp: 32,
      atk: 17,
      def: 15,
      spa: 12,
      spd: 12,
      spe: 20,
      moves: ['Picotazo Venenoso', 'Disparo Demora'],
    },
    oddish: {
      pokedexId: 43,
      name: 'Oddish',
      types: ['Planta', 'Veneno'],
      hp: 38,
      atk: 18,
      def: 20,
      spa: 24,
      spd: 22,
      spe: 15,
      moves: ['Absorber', 'Ácido'],
    },
    bellsprout: {
      pokedexId: 69,
      name: 'Bellsprout',
      types: ['Planta', 'Veneno'],
      hp: 36,
      atk: 24,
      def: 15,
      spa: 22,
      spd: 15,
      spe: 18,
      moves: ['Látigo Cepa', 'Repetición'],
    },
    geodude: {
      pokedexId: 74,
      name: 'Geodude',
      types: ['Roca', 'Tierra'],
      hp: 44,
      atk: 28,
      def: 38,
      spa: 15,
      spd: 16,
      spe: 12,
      moves: ['Lanzarrocas', 'Placaje'],
    },
    zubat: {
      pokedexId: 41,
      name: 'Zubat',
      types: ['Veneno', 'Volador'],
      hp: 36,
      atk: 19,
      def: 17,
      spa: 16,
      spd: 18,
      spe: 32,
      moves: ['Mordisco', 'Supersónico'],
    },
    machop: {
      pokedexId: 66,
      name: 'Machop',
      types: ['Lucha'],
      hp: 46,
      atk: 32,
      def: 22,
      spa: 18,
      spd: 18,
      spe: 19,
      moves: ['Golpe Kárate', 'Malicioso'],
    },
    electabuzz: {
      pokedexId: 125,
      name: 'Electabuzz',
      types: ['Eléctrico'],
      hp: 55,
      atk: 35,
      def: 24,
      spa: 38,
      spd: 32,
      spe: 36,
      moves: ['Puño Trueno', 'Chispazo'],
    },
    haunter: {
      pokedexId: 93,
      name: 'Haunter',
      types: ['Fantasma', 'Veneno'],
      hp: 45,
      atk: 22,
      def: 20,
      spa: 42,
      spd: 26,
      spe: 38,
      moves: ['Tinieblas', 'Rayo Confuso'],
    },
    jigglypuff: {
      pokedexId: 39,
      name: 'Jigglypuff',
      types: ['Normal', 'Hada'],
      hp: 48,
      atk: 18,
      def: 14,
      spa: 20,
      spd: 16,
      spe: 14,
      moves: ['Canto', 'Destructor', 'Viento Feérico'],
    },
    clefairy: {
      pokedexId: 35,
      name: 'Clefairy',
      types: ['Hada'],
      hp: 46,
      atk: 20,
      def: 22,
      spa: 26,
      spd: 28,
      spe: 16,
      moves: ['Beso Drenaje', 'Destructor', 'Encanto'],
    },
    magnemite: {
      pokedexId: 81,
      name: 'Magnemite',
      types: ['Eléctrico', 'Acero'],
      hp: 38,
      atk: 18,
      def: 30,
      spa: 30,
      spd: 22,
      spe: 22,
      moves: ['Impactrueno', 'Supersónico', 'Placaje'],
    },
    diglett: {
      pokedexId: 50,
      name: 'Diglett',
      types: ['Tierra'],
      hp: 30,
      atk: 26,
      def: 16,
      spa: 16,
      spd: 20,
      spe: 38,
      moves: ['Arañazo', 'Ataque Arena'],
    },
    graveler: {
      pokedexId: 75,
      name: 'Graveler',
      types: ['Roca', 'Tierra'],
      hp: 58,
      atk: 38,
      def: 46,
      spa: 20,
      spd: 22,
      spe: 18,
      moves: ['Lanzarrocas', 'Tumba Rocas', 'Fortaleza'],
    },
    fearow: {
      pokedexId: 22,
      name: 'Fearow',
      types: ['Normal', 'Volador'],
      hp: 52,
      atk: 38,
      def: 26,
      spa: 24,
      spd: 24,
      spe: 40,
      moves: ['Picotazo', 'Pico Taladro', 'Malicioso'],
    },
    raichu: {
      pokedexId: 26,
      name: 'Raichu',
      types: ['Eléctrico'],
      hp: 52,
      atk: 36,
      def: 24,
      spa: 38,
      spd: 30,
      spe: 42,
      moves: ['Chispazo', 'Ataque Rápido', 'Onda Trueno'],
    },
    // Arroyo Corriente roster
    lotad: {
      pokedexId: 270,
      name: 'Lotad',
      types: ['Agua', 'Planta'],
      hp: 30,
      atk: 12,
      def: 14,
      spa: 16,
      spd: 22,
      spe: 12,
      moves: ['Placaje', 'Absorber'],
      recruitRate: 0.2,
    },
    wooper: {
      pokedexId: 194,
      name: 'Wooper',
      types: ['Agua', 'Tierra'],
      hp: 36,
      atk: 18,
      def: 18,
      spa: 10,
      spd: 10,
      spe: 6,
      moves: ['Pistola Agua', 'Coletazo'],
      recruitRate: 0.2,
    },
    sentret: {
      pokedexId: 161,
      name: 'Sentret',
      types: ['Normal'],
      hp: 30,
      atk: 18,
      def: 12,
      spa: 12,
      spd: 14,
      spe: 8,
      moves: ['Arañazo', 'Rizo Defensa'],
      recruitRate: 0.2,
    },
    tarountula: {
      pokedexId: 917,
      name: 'Tarountula',
      types: ['Bicho'],
      hp: 30,
      atk: 16,
      def: 18,
      spa: 12,
      spd: 16,
      spe: 10,
      moves: ['Placaje', 'Disparo Demora'],
      recruitRate: 0.2,
    },
    surskit: {
      pokedexId: 283,
      name: 'Surskit',
      types: ['Bicho', 'Agua'],
      hp: 30,
      atk: 12,
      def: 12,
      spa: 18,
      spd: 18,
      spe: 20,
      moves: ['Burbuja', 'Ataque Rápido'],
      recruitRate: 0.2,
    },
    magikarp: {
      pokedexId: 129,
      name: 'Magikarp',
      types: ['Agua'],
      hp: 22,
      atk: 6,
      def: 20,
      spa: 10,
      spd: 12,
      spe: 28,
      moves: ['Salpicadura'],
      recruitRate: 0.1,
    },
    // Bosses
    boss_psyduck: {
      pokedexId: 54,
      name: 'Psyduck',
      types: ['Agua'],
      hp: 60,
      atk: 22,
      def: 20,
      spa: 28,
      spd: 22,
      spe: 24,
      moves: ['Arañazo', 'Pistola Agua', 'Confusión', 'Látigo'],
      recruitRate: 0.1,
    },
    boss_butterfree: {
      pokedexId: 12,
      name: 'Butterfree',
      types: ['Bicho', 'Volador'],
      hp: 85,
      atk: 25,
      def: 25,
      spa: 34,
      spd: 32,
      spe: 28,
      moves: ['Viento Plata', 'Confusión', 'Somnífero', 'Tornado'],
    },
    boss_onix: {
      pokedexId: 95,
      name: 'Onix',
      types: ['Roca', 'Tierra'],
      hp: 130,
      atk: 34,
      def: 55,
      spa: 20,
      spd: 25,
      spe: 26,
      moves: ['Lanza Rocas', 'Atadura', 'Tumba Rocas', 'Terremoto'],
    },
    boss_zapdos: {
      pokedexId: 145,
      name: 'Zapdos',
      types: ['Eléctrico', 'Volador'],
      hp: 200,
      atk: 48,
      def: 38,
      spa: 55,
      spd: 42,
      spe: 45,
      moves: ['Trueno', 'Pico Taladro', 'Onda Trueno', 'Agilidad'],
    },
  };

  const c = configs[enemyType] || configs.caterpie;
  // Legacy hand-tuned values only for species without official base stats
  const legacy = (value: number, growth: number) => Math.round(value * (1 + (level - 5) * growth));
  const stats: PokemonStats = calculateStats(c.pokedexId, level) ?? {
    hp: legacy(c.hp, 0.1),
    maxHp: legacy(c.hp, 0.1),
    attack: legacy(c.atk, 0.08),
    defense: legacy(c.def, 0.08),
    spAttack: legacy(c.spa, 0.08),
    spDefense: legacy(c.spd, 0.08),
    speed: legacy(c.spe, 0.08),
  };

  return {
    id: `enemy_${enemyType}_${Date.now()}_${Math.random()}`,
    pokedexId: c.pokedexId,
    name: c.name,
    level,
    exp: 0,
    nextExp: 50,
    types: c.types,
    stats,
    ability: 'Presión',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(c.pokedexId),
    artworkUrl: getPokemonArtwork(c.pokedexId),
    iconUrl: getPokemonStaticSprite(c.pokedexId),
    description: 'Un Pokémon territorial que vigila las profundidades de la mazmorra.',
    recruitRate: c.recruitRate,
    moves: getMovesForLevel(c.pokedexId, level) ?? c.moves.map((mName, idx) => {
      const dbMove = getMoveFromDb(mName);
      return {
        id: `enemy_move_${idx}_${mName.toLowerCase().replace(/\s+/g, '_')}`,
        name: mName,
        type: dbMove?.type || c.types[0],
        category: dbMove?.category || (idx % 2 === 0 ? 'physical' : 'special'),
        power: dbMove?.power ?? (35 + idx * 5),
        accuracy: dbMove?.accuracy ?? 95,
        pp: 20,
        maxPp: 20,
        description: dbMove?.description || 'Ataque del rival.',
      };
    }),
  };
};

// Default Backpack Inventory
export const BAG_LIMIT = 10;
export const bagCount = (inventory: Item[]): number => inventory.reduce((n, it) => n + it.count, 0);
export const bagSpace = (inventory: Item[]): number => Math.max(0, BAG_LIMIT - bagCount(inventory));

export const DEFAULT_INVENTORY: Item[] = [
  {
    id: 'item_oran_1',
    name: 'Baya Aranja',
    category: 'healing',
    description: 'Restaura 50 PS a un Pokémon del equipo.',
    count: 3,
    effectType: 'heal_hp',
    effectValue: 50,
    icon: '🍎',
  },
  {
    id: 'item_apple_1',
    name: 'Manzana Grande',
    category: 'food',
    description: 'Satisface el hambre (+50 de Tripa) durante la expedición.',
    count: 3,
    effectType: 'restore_belly',
    effectValue: 50,
    icon: '🍏',
  },
  {
    id: 'item_reviver_1',
    name: 'Semilla Revivir',
    category: 'seed',
    description: 'Revive inmediatamente a un Pokémon caído con el 100% de PS.',
    count: 2,
    effectType: 'revive',
    effectValue: 100,
    icon: '🌰',
  },
  {
    id: 'item_sleep_1',
    name: 'Semilla Sueño',
    category: 'seed',
    description: 'Duerme al Pokémon rival durante varios turnos.',
    count: 1,
    effectType: 'inflict_status',
    effectValue: 3,
    icon: '💤',
  },
  {
    id: 'item_escape_orb',
    name: 'Orbe Escape',
    category: 'orb',
    description: 'Permite salir inmediatamente de la mazmorra conservando objetos y oro.',
    count: 1,
    effectType: 'escape',
    effectValue: 1,
    icon: '🔮',
  },
];

// Bulletin Board Rescue Missions
export const INITIAL_MISSIONS: RescueMission[] = [
  {
    id: 'mission_1',
    title: '¡Ayuda! Mi hermano Caterpie se perdió',
    clientPokemonName: 'Butterfree',
    clientPokedexId: 12,
    targetPokemonName: 'Caterpie',
    dungeonId: 'bosquejo_tutorial',
    targetFloor: 3,
    rewardGold: 350,
    rewardItem: 'Baya Aranja x2',
    difficulty: 'Fácil (★☆☆☆☆)',
    completed: false,
  },
  {
    id: 'mission_2',
    title: 'Perdí mi tesoro en la Cueva Resonante',
    clientPokemonName: 'Magnemite',
    clientPokedexId: 81,
    targetPokemonName: 'Tesoro de Cristal',
    dungeonId: 'cueva_estruendo',
    targetFloor: 5,
    rewardGold: 700,
    rewardItem: 'Semilla Fuerza',
    difficulty: 'Media (★★★☆☆)',
    completed: false,
  },
  {
    id: 'mission_3',
    title: '¡Desafío supremo en el Pico Tempestad!',
    clientPokemonName: 'Dragonite',
    clientPokedexId: 149,
    targetPokemonName: 'Zapdos',
    dungeonId: 'pico_tempestad',
    targetFloor: 10,
    rewardGold: 2000,
    rewardItem: 'Cinta Heroica',
    difficulty: 'Extrema (★★★★★)',
    completed: false,
  },
];

// ==========================================
// POKÉMON MYSTERY DUNGEON EVOLUTION SYSTEM
// ==========================================

export interface EvolutionOption {
  targetPokedexId: number;
  targetName: string;
  minLevel: number;
  // Evolution stone needed (consumed on evolving); level is irrelevant when set
  requiredItem?: string;
  // Hand-tuned gains, only used for species without official base stats
  statGains?: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  types: PokemonType[];
  ability: string;
  description: string;
  learnedMove?: Move;
}

// Hand-written entries (custom texts and level choices); they take precedence over the generated data
const MANUAL_EVOLUTIONS: Record<number, EvolutionOption[]> = {
  // 1: Bulbasaur -> 2: Ivysaur -> 3: Venusaur
  1: [
    {
      targetPokedexId: 2,
      targetName: 'Ivysaur',
      minLevel: 16,
      statGains: { hp: 15, attack: 11, defense: 11, spAttack: 15, spDefense: 14, speed: 10 },
      types: ['Planta', 'Veneno'],
      ability: 'Espesura',
      description: 'La flor de su lomo crece al absorber luz solar. Se vuelve más robusto y resistente.',
      learnedMove: {
        id: 'move_razor_leaf',
        name: 'Hoja Afilada',
        type: 'Planta',
        category: 'physical',
        power: 55,
        accuracy: 95,
        pp: 25,
        maxPp: 25,
        description: 'Lanza hojas afiladas como cuchillas con alta probabilidad de golpe crítico.',
      },
    },
  ],
  2: [
    {
      targetPokedexId: 3,
      targetName: 'Venusaur',
      minLevel: 32,
      statGains: { hp: 22, attack: 14, defense: 16, spAttack: 20, spDefense: 18, speed: 12 },
      types: ['Planta', 'Veneno'],
      ability: 'Espesura',
      description: 'Una flor gigantesca florece en su espalda, emanando un aroma reconfortante que atrae aliados.',
      learnedMove: {
        id: 'move_solar_beam',
        name: 'Rayo Solar',
        type: 'Planta',
        category: 'special',
        power: 120,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Desata una devastadora concentración de energía solar acumulada.',
      },
    },
  ],

  // 4: Charmander -> 5: Charmeleon -> 6: Charizard
  4: [
    {
      targetPokedexId: 5,
      targetName: 'Charmeleon',
      minLevel: 16,
      statGains: { hp: 16, attack: 13, defense: 9, spAttack: 15, spDefense: 10, speed: 12 },
      types: ['Fuego'],
      ability: 'Mar Llamas',
      description: 'Blande su cola incandescente con furia. En combate derriba a sus rivales con garras candentes.',
      learnedMove: {
        id: 'move_dragon_rage',
        name: 'Furia Dragón',
        type: 'Dragón',
        category: 'special',
        power: 65,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Golpea con llamaradas místicas de energía de dragón ancestral.',
      },
    },
  ],
  5: [
    {
      targetPokedexId: 6,
      targetName: 'Charizard',
      minLevel: 36,
      statGains: { hp: 22, attack: 16, defense: 14, spAttack: 24, spDefense: 16, speed: 18 },
      types: ['Fuego', 'Volador'],
      ability: 'Mar Llamas',
      description: 'Vuela por los cielos buscando rivales formidables. Su fuego alcanza temperaturas capaces de fundir rocas.',
      learnedMove: {
        id: 'move_flamethrower',
        name: 'Lanzallamas',
        type: 'Fuego',
        category: 'special',
        power: 90,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Dispara una descomunal ráfaga de fuego que puede causar quemaduras.',
        statusEffect: 'burn',
      },
    },
  ],

  // 7: Squirtle -> 8: Wartortle -> 9: Blastoise
  7: [
    {
      targetPokedexId: 8,
      targetName: 'Wartortle',
      minLevel: 16,
      statGains: { hp: 15, attack: 11, defense: 15, spAttack: 12, spDefense: 14, speed: 10 },
      types: ['Agua'],
      ability: 'Torrente',
      description: 'Su esponjosa cola de pelo blanco es símbolo de longevidad y sabiduría entre los Pokémon marinos.',
      learnedMove: {
        id: 'move_water_pulse',
        name: 'Hidropulso',
        type: 'Agua',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Onda ultrasónica de agua que sacude al rival.',
      },
    },
  ],
  8: [
    {
      targetPokedexId: 9,
      targetName: 'Blastoise',
      minLevel: 36,
      statGains: { hp: 22, attack: 15, defense: 22, spAttack: 18, spDefense: 20, speed: 12 },
      types: ['Agua'],
      ability: 'Torrente',
      description: 'Posee dos cañones hidrostáticos en su caparazón que disparan torrentes de agua de altísima presión.',
      learnedMove: {
        id: 'move_hydro_pump',
        name: 'Hidrobomba',
        type: 'Agua',
        category: 'special',
        power: 110,
        accuracy: 80,
        pp: 5,
        maxPp: 5,
        description: 'Lanza un cañonazo masivo de agua contra el enemigo.',
      },
    },
  ],

  // 10: Caterpie -> 11: Metapod -> 12: Butterfree
  10: [
    {
      targetPokedexId: 11,
      targetName: 'Metapod',
      minLevel: 7,
      statGains: { hp: 12, attack: 6, defense: 22, spAttack: 6, spDefense: 12, speed: 5 },
      types: ['Bicho'],
      ability: 'Mudar',
      description: 'Su caparazón exterior es tan duro como el acero para proteger el cuerpo en metamorfosis.',
      learnedMove: {
        id: 'move_harden',
        name: 'Fortaleza',
        type: 'Normal',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Endurece su cuerpo al máximo subiendo su Defensa.',
        statusEffect: 'defense_boost',
      },
    },
  ],
  11: [
    {
      targetPokedexId: 12,
      targetName: 'Butterfree',
      minLevel: 10,
      statGains: { hp: 18, attack: 10, defense: 12, spAttack: 22, spDefense: 20, speed: 18 },
      types: ['Bicho', 'Volador'],
      ability: 'Ojo Compuesto',
      description: 'Aletea grácilmente liberando escamas tóxicas y somníferas. Su visión percibe flores a kilómetros.',
      learnedMove: {
        id: 'move_silver_wind',
        name: 'Viento Plata',
        type: 'Bicho',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Ráfaga de viento plateado brillante que azota a los rivales.',
      },
    },
  ],

  // 13: Weedle -> 14: Kakuna -> 15: Beedrill
  13: [
    {
      targetPokedexId: 14,
      targetName: 'Kakuna',
      minLevel: 7,
      statGains: { hp: 12, attack: 8, defense: 20, spAttack: 6, spDefense: 12, speed: 6 },
      types: ['Bicho', 'Veneno'],
      ability: 'Mudar',
      description: 'Permanece casi inmóvil colgado de ramas preparándose para su evolución final.',
      learnedMove: {
        id: 'move_harden_kakuna',
        name: 'Fortaleza',
        type: 'Normal',
        category: 'status',
        power: 0,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Endurece su caparazón aumentando su Defensa.',
        statusEffect: 'defense_boost',
      },
    },
  ],
  14: [
    {
      targetPokedexId: 15,
      targetName: 'Beedrill',
      minLevel: 10,
      statGains: { hp: 18, attack: 24, defense: 12, spAttack: 12, spDefense: 14, speed: 20 },
      types: ['Bicho', 'Veneno'],
      ability: 'Enjambre',
      description: 'Extremadamente territorial y veloz. Ataca con los tres aguijones venenosos de sus patas y cola.',
      learnedMove: {
        id: 'move_twineedle',
        name: 'Doble Ataque',
        type: 'Bicho',
        category: 'physical',
        power: 55,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Clava sus aguijones en rápida sucesión con toxinas.',
        statusEffect: 'poison',
      },
    },
  ],

  // 16: Pidgey -> 17: Pidgeotto -> 18: Pidgeot
  16: [
    {
      targetPokedexId: 17,
      targetName: 'Pidgeotto',
      minLevel: 18,
      statGains: { hp: 16, attack: 14, defense: 12, spAttack: 12, spDefense: 12, speed: 16 },
      types: ['Normal', 'Volador'],
      ability: 'Vista Lince',
      description: 'Vuela en círculos sobre su territorio vigilando con sus afilados ojos.',
      learnedMove: {
        id: 'move_wing_attack',
        name: 'Ataque Ala',
        type: 'Volador',
        category: 'physical',
        power: 60,
        accuracy: 100,
        pp: 35,
        maxPp: 35,
        description: 'Golpea al enemigo abriendo y descargando sus grandes alas.',
      },
    },
  ],
  17: [
    {
      targetPokedexId: 18,
      targetName: 'Pidgeot',
      minLevel: 36,
      statGains: { hp: 22, attack: 18, defense: 16, spAttack: 16, spDefense: 16, speed: 22 },
      types: ['Normal', 'Volador'],
      ability: 'Vista Lince',
      description: 'Vuela a Mach 2 batiendo sus majestuosas alas doradas, levantando vendavales.',
      learnedMove: {
        id: 'move_hurricane',
        name: 'Vendaval',
        type: 'Volador',
        category: 'special',
        power: 110,
        accuracy: 70,
        pp: 10,
        maxPp: 10,
        description: 'Envuelve al enemigo en un tifón descomunal.',
      },
    },
  ],

  // 25: Pikachu -> 26: Raichu
  25: [
    {
      targetPokedexId: 26,
      targetName: 'Raichu',
      minLevel: 1,
      requiredItem: 'Piedra Trueno',
      statGains: { hp: 18, attack: 16, defense: 10, spAttack: 20, spDefense: 12, speed: 18 },
      types: ['Eléctrico'],
      ability: 'Elec. Estática',
      description: 'Su larga cola actúa como pararrayos para protegerse del alto voltaje acumulado en su cuerpo.',
      learnedMove: {
        id: 'move_thunderbolt',
        name: 'Rayo',
        type: 'Eléctrico',
        category: 'special',
        power: 90,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Poderoso relámpago que fulmina al oponente y puede paralizarlo.',
        statusEffect: 'paralysis',
      },
    },
  ],

  // 41: Zubat -> 42: Golbat -> 169: Crobat
  41: [
    {
      targetPokedexId: 42,
      targetName: 'Golbat',
      minLevel: 22,
      statGains: { hp: 20, attack: 16, defense: 14, spAttack: 14, spDefense: 14, speed: 20 },
      types: ['Veneno', 'Volador'],
      ability: 'Foco Interno',
      description: 'Sus colmillos son capaces de perforar pieles duras en cavernas oscuras.',
      learnedMove: {
        id: 'move_poison_fang',
        name: 'Colmillo Veneno',
        type: 'Veneno',
        category: 'physical',
        power: 50,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Muerde con colmillos rezumantes de ponzoña.',
        statusEffect: 'poison',
      },
    },
  ],
  42: [
    {
      targetPokedexId: 169,
      targetName: 'Crobat',
      minLevel: 35,
      statGains: { hp: 22, attack: 18, defense: 16, spAttack: 16, spDefense: 16, speed: 28 },
      types: ['Veneno', 'Volador'],
      ability: 'Foco Interno',
      description: 'Con cuatro alas bate el aire con sigilo absoluto a velocidades vertiginosas.',
      learnedMove: {
        id: 'move_cross_poison',
        name: 'Veneno X',
        type: 'Veneno',
        category: 'physical',
        power: 70,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Cuchillada venenosa en aspa con alta probabilidad de crítico.',
        statusEffect: 'poison',
      },
    },
  ],

  // 43: Oddish -> 44: Gloom -> 45: Vileplume
  43: [
    {
      targetPokedexId: 44,
      targetName: 'Gloom',
      minLevel: 21,
      statGains: { hp: 16, attack: 14, defense: 15, spAttack: 18, spDefense: 16, speed: 8 },
      types: ['Planta', 'Veneno'],
      ability: 'Clorofila',
      description: 'Segrega un néctar de intenso aroma desde su flor.',
      learnedMove: {
        id: 'move_mega_drain',
        name: 'Megaagotar',
        type: 'Planta',
        category: 'special',
        power: 40,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Absorbe los puntos de salud del enemigo.',
        healPercent: 50,
      },
    },
  ],
  44: [
    {
      targetPokedexId: 45,
      targetName: 'Vileplume',
      minLevel: 1,
      requiredItem: 'Piedra Hoja',
      statGains: { hp: 20, attack: 16, defense: 18, spAttack: 24, spDefense: 18, speed: 10 },
      types: ['Planta', 'Veneno'],
      ability: 'Efecto Espora',
      description: 'Sus enormes pétalos rojos esparcen polen curativo o somnífero.',
      learnedMove: {
        id: 'move_petal_dance',
        name: 'Danza Pétalo',
        type: 'Planta',
        category: 'special',
        power: 90,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Tormenta de pétalos afilados contra el rival.',
      },
    },
  ],

  // 66: Machop -> 67: Machoke -> 68: Machamp
  66: [
    {
      targetPokedexId: 67,
      targetName: 'Machoke',
      minLevel: 28,
      statGains: { hp: 22, attack: 24, defense: 16, spAttack: 10, spDefense: 12, speed: 12 },
      types: ['Lucha'],
      ability: 'Agallas',
      description: 'Su cinturón de campeón regula su inagotable fuerza muscular.',
      learnedMove: {
        id: 'move_submission',
        name: 'Sumisión',
        type: 'Lucha',
        category: 'physical',
        power: 80,
        accuracy: 80,
        pp: 20,
        maxPp: 20,
        description: 'Técnica de lucha demoledora.',
      },
    },
  ],
  67: [
    {
      targetPokedexId: 68,
      targetName: 'Machamp',
      minLevel: 36,
      statGains: { hp: 26, attack: 28, defense: 18, spAttack: 12, spDefense: 16, speed: 14 },
      types: ['Lucha'],
      ability: 'Indefenso',
      description: 'Posee cuatro brazos colosales capaces de lanzar mil puñetazos en segundos.',
      learnedMove: {
        id: 'move_cross_chop',
        name: 'Tajo Cruzado',
        type: 'Lucha',
        category: 'physical',
        power: 100,
        accuracy: 80,
        pp: 5,
        maxPp: 5,
        description: 'Doble golpe de brazos cruzados con altísima fuerza bruta.',
      },
    },
  ],

  // 69: Bellsprout -> 70: Weepinbell -> 71: Victreebel
  69: [
    {
      targetPokedexId: 70,
      targetName: 'Weepinbell',
      minLevel: 21,
      statGains: { hp: 16, attack: 18, defense: 12, spAttack: 18, spDefense: 10, speed: 12 },
      types: ['Planta', 'Veneno'],
      ability: 'Clorofila',
      description: 'Cuelga de ramas esperando presas para disolver con ácidos.',
    },
  ],
  70: [
    {
      targetPokedexId: 71,
      targetName: 'Victreebel',
      minLevel: 1,
      requiredItem: 'Piedra Hoja',
      statGains: { hp: 20, attack: 22, defense: 15, spAttack: 22, spDefense: 14, speed: 14 },
      types: ['Planta', 'Veneno'],
      ability: 'Clorofila',
      description: 'Atrae a sus presas con un néctar dulce y cierra su boca velozmente.',
      learnedMove: {
        id: 'move_leaf_blade',
        name: 'Hoja Afilada',
        type: 'Planta',
        category: 'physical',
        power: 75,
        accuracy: 95,
        pp: 15,
        maxPp: 15,
        description: 'Corta al enemigo con hojas rígidas como espadas.',
      },
    },
  ],

  // 74: Geodude -> 75: Graveler -> 76: Golem
  74: [
    {
      targetPokedexId: 75,
      targetName: 'Graveler',
      minLevel: 25,
      statGains: { hp: 18, attack: 20, defense: 24, spAttack: 10, spDefense: 12, speed: 8 },
      types: ['Roca', 'Tierra'],
      ability: 'Robustez',
      description: 'Baja rodando por colinas montañosas sin frenar ante nada.',
      learnedMove: {
        id: 'move_magnitude',
        name: 'Magnitud',
        type: 'Tierra',
        category: 'physical',
        power: 70,
        accuracy: 100,
        pp: 30,
        maxPp: 30,
        description: 'Onda de choque terrestre que sacude la zona.',
      },
    },
  ],
  75: [
    {
      targetPokedexId: 76,
      targetName: 'Golem',
      minLevel: 36,
      statGains: { hp: 24, attack: 24, defense: 28, spAttack: 12, spDefense: 14, speed: 10 },
      types: ['Roca', 'Tierra'],
      ability: 'Robustez',
      description: 'Su coraza pétrea es capaz de resistir explosiones de dinamita.',
      learnedMove: {
        id: 'move_earthquake',
        name: 'Terremoto',
        type: 'Tierra',
        category: 'physical',
        power: 100,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Sacudida sísmica que hace temblar la tierra.',
      },
    },
  ],

  // 92: Gastly -> 93: Haunter -> 94: Gengar
  92: [
    {
      targetPokedexId: 93,
      targetName: 'Haunter',
      minLevel: 25,
      statGains: { hp: 15, attack: 12, defense: 12, spAttack: 26, spDefense: 14, speed: 20 },
      types: ['Fantasma', 'Veneno'],
      ability: 'Levitación',
      description: 'Puede atravesar paredes sólidas y ocultarse en las sombras.',
      learnedMove: {
        id: 'move_shadow_punch',
        name: 'Puño Sombra',
        type: 'Fantasma',
        category: 'physical',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Puñetazo fantasmal que nunca falla.',
      },
    },
  ],
  93: [
    {
      targetPokedexId: 94,
      targetName: 'Gengar',
      minLevel: 36,
      statGains: { hp: 20, attack: 14, defense: 16, spAttack: 28, spDefense: 18, speed: 22 },
      types: ['Fantasma', 'Veneno'],
      ability: 'Cuerpo Maldito',
      description: 'Sonríe malévolamente desde la oscuridad. Absorbe el calor de su entorno.',
      learnedMove: {
        id: 'move_shadow_ball',
        name: 'Bola Sombra',
        type: 'Fantasma',
        category: 'special',
        power: 80,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Lanza una esfera oscura que puede reducir la defensa especial del rival.',
      },
    },
  ],

  // 19: Rattata -> 20: Raticate
  19: [
    {
      targetPokedexId: 20,
      targetName: 'Raticate',
      minLevel: 20,
      types: ['Normal'],
      ability: 'Agallas',
      description: 'Sus colmillos crecen sin parar y puede roer cualquier cosa, incluso el cemento.',
      learnedMove: {
        id: 'move_hyper_fang',
        name: 'Hipercolmillo',
        type: 'Normal',
        category: 'physical',
        power: 80,
        accuracy: 90,
        pp: 15,
        maxPp: 15,
        description: 'Muerde con unos colmillos afiladísimos.',
      },
    },
  ],

  // 165: Ledyba -> 166: Ledian
  165: [
    {
      targetPokedexId: 166,
      targetName: 'Ledian',
      minLevel: 18,
      types: ['Bicho', 'Volador'],
      ability: 'Madrugar',
      description: 'Vuela de noche esparciendo un polvo brillante que le sirve de luz.',
      learnedMove: {
        id: 'move_comet_punch',
        name: 'Puño Cometa',
        type: 'Normal',
        category: 'physical',
        power: 54,
        accuracy: 85,
        pp: 15,
        maxPp: 15,
        description: 'Lanza una ráfaga de puñetazos veloces.',
      },
    },
  ],

  // 401: Kricketot -> 402: Kricketune
  401: [
    {
      targetPokedexId: 402,
      targetName: 'Kricketune',
      minLevel: 10,
      types: ['Bicho'],
      ability: 'Mudar',
      description: 'Cruza sus brazos afilados como un violinista para crear melodías.',
      learnedMove: {
        id: 'move_fury_cutter',
        name: 'Corte Furia',
        type: 'Bicho',
        category: 'physical',
        power: 40,
        accuracy: 95,
        pp: 20,
        maxPp: 20,
        description: 'Tajos cada vez más fuertes con sus guadañas.',
      },
    },
  ],

  // 504: Patrat -> 505: Watchog
  504: [
    {
      targetPokedexId: 505,
      targetName: 'Watchog',
      minLevel: 20,
      types: ['Normal'],
      ability: 'Iluminación',
      description: 'Hace brillar su cuerpo para intimidar a los intrusos que vigila.',
      learnedMove: {
        id: 'move_crunch_watchog',
        name: 'Triturar',
        type: 'Siniestro',
        category: 'physical',
        power: 80,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Tritura al rival con sus afilados colmillos.',
      },
    },
  ],

  // 191: Sunkern -> 192: Sunflora (Piedra Solar en los juegos; aquí por nivel)
  191: [
    {
      targetPokedexId: 192,
      targetName: 'Sunflora',
      minLevel: 1,
      requiredItem: 'Piedra Solar',
      types: ['Planta'],
      ability: 'Clorofila',
      description: 'Convierte la luz del sol en energía y se mueve con energía bajo el calor.',
      learnedMove: {
        id: 'move_razor_leaf_sunflora',
        name: 'Hoja Afilada',
        type: 'Planta',
        category: 'physical',
        power: 55,
        accuracy: 95,
        pp: 25,
        maxPp: 25,
        description: 'Lanza hojas cortantes como cuchillas.',
      },
    },
  ],

  // 35: Clefairy -> 36: Clefable (Piedra Lunar en los juegos; aquí por nivel)
  35: [
    {
      targetPokedexId: 36,
      targetName: 'Clefable',
      minLevel: 1,
      requiredItem: 'Piedra Lunar',
      types: ['Hada'],
      ability: 'Gran Encanto',
      description: 'Un Pokémon de leyenda que rara vez se deja ver; dicen que vive en las montañas.',
      learnedMove: {
        id: 'move_moonblast',
        name: 'Fuerza Lunar',
        type: 'Hada',
        category: 'special',
        power: 95,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Invoca el poder de la luna contra el objetivo.',
      },
    },
  ],

  // 39: Jigglypuff -> 40: Wigglytuff (Piedra Lunar en los juegos; aquí por nivel)
  39: [
    {
      targetPokedexId: 40,
      targetName: 'Wigglytuff',
      minLevel: 1,
      requiredItem: 'Piedra Lunar',
      types: ['Normal', 'Hada'],
      ability: 'Gran Encanto',
      description: 'Su pelaje es tan suave que quien lo toca no quiere soltarlo.',
      learnedMove: {
        id: 'move_dazzling_gleam',
        name: 'Brillo Mágico',
        type: 'Hada',
        category: 'special',
        power: 80,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Emite un destello de luz deslumbrante.',
      },
    },
  ],

  // 81: Magnemite -> 82: Magneton -> 462: Magnezone
  81: [
    {
      targetPokedexId: 82,
      targetName: 'Magneton',
      minLevel: 30,
      types: ['Eléctrico', 'Acero'],
      ability: 'Robustez',
      description: 'Tres Magnemite unidos que emiten fuertes ondas de radio.',
      learnedMove: {
        id: 'move_spark_magneton',
        name: 'Chispazo',
        type: 'Eléctrico',
        category: 'special',
        power: 80,
        accuracy: 100,
        pp: 15,
        maxPp: 15,
        description: 'Una descarga eléctrica radial.',
      },
    },
  ],
  82: [
    {
      targetPokedexId: 462,
      targetName: 'Magnezone',
      minLevel: 1,
      requiredItem: 'Piedra Trueno',
      types: ['Eléctrico', 'Acero'],
      ability: 'Imán',
      description: 'Un campo magnético especial lo transformó; emite ondas misteriosas.',
      learnedMove: {
        id: 'move_flash_cannon',
        name: 'Foco Resplandor',
        type: 'Acero',
        category: 'special',
        power: 80,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Libera toda la luz acumulada en un disparo metálico.',
      },
    },
  ],

  // 50: Diglett -> 51: Dugtrio
  50: [
    {
      targetPokedexId: 51,
      targetName: 'Dugtrio',
      minLevel: 26,
      types: ['Tierra'],
      ability: 'Velo Arena',
      description: 'Trillizos que excavan a gran velocidad hasta 100 km bajo tierra.',
      learnedMove: {
        id: 'move_dig_dugtrio',
        name: 'Excavar',
        type: 'Tierra',
        category: 'physical',
        power: 80,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Se oculta bajo tierra y ataca desde abajo.',
      },
    },
  ],

  // 133: Eevee -> Vaporeon (134), Jolteon (135), Flareon (136), Sylveon (700)
  133: [
    {
      targetPokedexId: 134,
      targetName: 'Vaporeon',
      minLevel: 1,
      requiredItem: 'Piedra Agua',
      statGains: { hp: 35, attack: 14, defense: 14, spAttack: 24, spDefense: 22, speed: 14 },
      types: ['Agua'],
      ability: 'Absorbe Agua',
      description: 'Su estructura celular es similar a la del agua, permitiéndole fundirse en ella.',
      learnedMove: {
        id: 'move_water_pulse_vap',
        name: 'Hidropulso',
        type: 'Agua',
        category: 'special',
        power: 60,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Ondas acuáticas vibrantes ultrasónicas.',
      },
    },
    {
      targetPokedexId: 135,
      targetName: 'Jolteon',
      minLevel: 1,
      requiredItem: 'Piedra Trueno',
      statGains: { hp: 16, attack: 14, defense: 12, spAttack: 24, spDefense: 20, speed: 30 },
      types: ['Eléctrico'],
      ability: 'Absorbe Elec',
      description: 'Eriza su pelaje como agujas electrificadas de alto voltaje.',
      learnedMove: {
        id: 'move_spark',
        name: 'Chispazo',
        type: 'Eléctrico',
        category: 'special',
        power: 65,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Descarga eléctrica que puede paralizar.',
        statusEffect: 'paralysis',
      },
    },
    {
      targetPokedexId: 136,
      targetName: 'Flareon',
      minLevel: 1,
      requiredItem: 'Piedra Fuego',
      statGains: { hp: 18, attack: 28, defense: 14, spAttack: 20, spDefense: 22, speed: 14 },
      types: ['Fuego'],
      ability: 'Agallas',
      description: 'Almacena aire caliente en su bolsa de fuego a más de 1.700 grados.',
      learnedMove: {
        id: 'move_fire_fang',
        name: 'Colmillo Ígneo',
        type: 'Fuego',
        category: 'physical',
        power: 65,
        accuracy: 95,
        pp: 15,
        maxPp: 15,
        description: 'Mordisco envuelto en ardientes llamaradas.',
        statusEffect: 'burn',
      },
    },
    {
      targetPokedexId: 700,
      targetName: 'Sylveon',
      minLevel: 15,
      statGains: { hp: 24, attack: 12, defense: 14, spAttack: 26, spDefense: 30, speed: 12 },
      types: ['Hada'],
      ability: 'Piel Feérica',
      description: 'Envuelve a sus aliados con sus cintas sensoriales para calmar cualquier hostilidad.',
      learnedMove: {
        id: 'move_draining_kiss',
        name: 'Beso Drenaje',
        type: 'Hada',
        category: 'special',
        power: 50,
        accuracy: 100,
        pp: 10,
        maxPp: 10,
        description: 'Un beso que absorbe la energía del rival.',
      },
    },
  ],

  // 155: Cyndaquil -> 156: Quilava -> 157: Typhlosion
  155: [
    {
      targetPokedexId: 156,
      targetName: 'Quilava',
      minLevel: 14,
      statGains: { hp: 16, attack: 14, defense: 12, spAttack: 18, spDefense: 14, speed: 16 },
      types: ['Fuego'],
      ability: 'Mar Llamas',
      description: 'Sus ráfagas de fuego salen disparadas desde su nuca y lomo con gran agilidad.',
      learnedMove: {
        id: 'move_flame_charge',
        name: 'Nitrocarga',
        type: 'Fuego',
        category: 'physical',
        power: 50,
        accuracy: 100,
        pp: 20,
        maxPp: 20,
        description: 'Embestida ardiente que incrementa la agilidad del usuario.',
      },
    },
  ],
  156: [
    {
      targetPokedexId: 157,
      targetName: 'Typhlosion',
      minLevel: 36,
      statGains: { hp: 22, attack: 18, defense: 16, spAttack: 24, spDefense: 18, speed: 20 },
      types: ['Fuego'],
      ability: 'Mar Llamas',
      description: 'Se frota el pelaje para provocar explosiones devastadoras de calor y fuego.',
      learnedMove: {
        id: 'move_eruption',
        name: 'Estallido',
        type: 'Fuego',
        category: 'special',
        power: 120,
        accuracy: 100,
        pp: 5,
        maxPp: 5,
        description: 'Erupción volcánica devastadora que arrasa el campo de batalla.',
      },
    },
  ],
};

/** Every evolution in the game: official families from PokéAPI, with manual entries replacing matching targets. */
export const EVOLUTION_REGISTRY: Record<number, EvolutionOption[]> = (() => {
  const registry: Record<number, EvolutionOption[]> = {};
  for (const [id, data] of Object.entries(SPECIES_DATA)) {
    const options = data.evolutions.flatMap((evo): EvolutionOption[] => {
      const target = SPECIES_DATA[evo.targetId];
      if (!target) return [];
      return [{
        targetPokedexId: evo.targetId,
        targetName: target.name,
        minLevel: evo.minLevel,
        requiredItem: evo.requiredItem,
        types: target.types,
        ability: target.ability,
        description: target.description || `${target.name}, Pokémon de tipo ${target.types.join(' y ')}.`,
      }];
    });
    if (options.length > 0) registry[Number(id)] = options;
  }
  for (const [id, manual] of Object.entries(MANUAL_EVOLUTIONS)) {
    const generated = registry[Number(id)] ?? [];
    registry[Number(id)] = [
      ...generated.filter((g) => !manual.some((m) => m.targetPokedexId === g.targetPokedexId)),
      ...manual,
    ];
  }
  return registry;
})();

/**
 * Returns available evolution options for a Pokémon. Empty array if final form.
 */
export const getEvolutionOptions = (pokedexId: number): EvolutionOption[] => {
  return EVOLUTION_REGISTRY[pokedexId] || [];
};

/** Whether a single evolution branch is possible right now (level + stone if needed). */
export const isEvolutionOptionAvailable = (
  pokemon: Pokemon,
  option: EvolutionOption,
  availableItems: string[] = []
): boolean =>
  pokemon.level >= option.minLevel &&
  (!option.requiredItem || availableItems.includes(option.requiredItem));

/**
 * Checks whether a given Pokemon meets the requirements to evolve
 */
export const canPokemonEvolve = (
  pokemon: Pokemon,
  availableItems: string[] = []
): {
  hasEvolutions: boolean;
  canEvolve: boolean;
  options: EvolutionOption[];
  minLevelRequired: number;
  levelDeficit: number;
  requiredItems: string[];
} => {
  const options = getEvolutionOptions(pokemon.pokedexId);
  if (options.length === 0) {
    return {
      hasEvolutions: false,
      canEvolve: false,
      options: [],
      minLevelRequired: 0,
      levelDeficit: 0,
      requiredItems: [],
    };
  }

  const levelOptions = options.filter((o) => !o.requiredItem);
  const minLevelRequired = levelOptions.length > 0 ? Math.min(...levelOptions.map((o) => o.minLevel)) : 0;
  const canEvolve = options.some((o) => isEvolutionOptionAvailable(pokemon, o, availableItems));
  const levelDeficit = Math.max(0, minLevelRequired - pokemon.level);
  const requiredItems = [...new Set(options.flatMap((o) => (o.requiredItem ? [o.requiredItem] : [])))];

  return {
    hasEvolutions: true,
    canEvolve,
    options,
    minLevelRequired,
    levelDeficit,
    requiredItems,
  };
};

/**
 * Stat change an evolution would cause right now (official bases at the current level),
 * falling back to the hand-written gains for species without base stats.
 */
export const getEvolutionStatGains = (
  pokemon: Pokemon,
  option: EvolutionOption
): NonNullable<EvolutionOption['statGains']> => {
  const current = calculateStats(pokemon.pokedexId, pokemon.level);
  const evolved = calculateStats(option.targetPokedexId, pokemon.level);
  if (!current || !evolved) {
    return option.statGains ?? { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  }
  return {
    hp: evolved.maxHp - current.maxHp,
    attack: evolved.attack - current.attack,
    defense: evolved.defense - current.defense,
    spAttack: evolved.spAttack - current.spAttack,
    spDefense: evolved.spDefense - current.spDefense,
    speed: evolved.speed - current.speed,
  };
};

/**
 * Executes the evolution transformation, updating stats, types and metadata.
 * Moves are kept; the move history carries over so pre-evolution moves stay equippable.
 */
export const evolvePokemon = (
  pokemon: Pokemon,
  chosenOption: EvolutionOption
): Pokemon => {
  const gains = getEvolutionStatGains(pokemon, chosenOption);
  const newMaxHp = pokemon.stats.maxHp + gains.hp;
  const newHp = Math.min(newMaxHp, pokemon.stats.hp + gains.hp);

  return {
    ...rememberMoves(pokemon, pokemon.moves),
    pokedexId: chosenOption.targetPokedexId,
    name: chosenOption.targetName,
    types: chosenOption.types,
    ability: chosenOption.ability,
    description: chosenOption.description,
    spriteUrl: getPmdPortraitUrl(chosenOption.targetPokedexId),
    artworkUrl: getPmdPortraitUrl(chosenOption.targetPokedexId),
    iconUrl: getPmdPortraitUrl(chosenOption.targetPokedexId),
    stats: {
      hp: newHp,
      maxHp: newMaxHp,
      attack: pokemon.stats.attack + gains.attack,
      defense: pokemon.stats.defense + gains.defense,
      spAttack: pokemon.stats.spAttack + gains.spAttack,
      spDefense: pokemon.stats.spDefense + gains.spDefense,
      speed: pokemon.stats.speed + gains.speed,
    },
  };
};
