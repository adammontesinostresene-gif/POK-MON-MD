// Generates src/data/learnsets.ts from PokéAPI (official level-up learnsets + Spanish move data).
// Usage: node scripts/generate-learnsets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://pokeapi.co/api/v2';

// Newest games first: each species uses the most recent learnset available
const VERSION_GROUPS = [
  'scarlet-violet',
  'sword-shield',
  'brilliant-diamond-and-shining-pearl',
  'ultra-sun-ultra-moon',
  'black-2-white-2',
];

const TYPE_ES = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  steel: 'Acero', dark: 'Siniestro', fairy: 'Hada',
};
const AILMENTS = new Set(['paralysis', 'burn', 'sleep', 'poison', 'freeze']);
const STATS = {
  attack: 'attack', defense: 'defense', 'special-attack': 'spAttack', 'special-defense': 'spDefense',
  speed: 'speed', accuracy: 'accuracy', evasion: 'evasion',
};
const SELF_TARGETS = new Set(['user', 'user-and-allies', 'users-field', 'user-or-ally', 'ally', 'all-allies']);
// Spread moves; in this game they only hit the opposing side
const AREA_TARGETS = new Set(['all-opponents', 'all-other-pokemon', 'opponents-field']);

// Seed species = every Pokédex number used in the game data; whole evolution families are added below
const seedSources = ['src/data/pokemonData.ts', 'src/data/eventData.ts'].map((f) => readFileSync(join(root, f), 'utf8'));
const baseBlock = seedSources[0].match(/const BASE_STATS[^{]*\{([\s\S]*?)\n\};/)[1];
const seedIds = new Set([
  ...[...baseBlock.matchAll(/^\s*(\d+):/gm)].map((m) => Number(m[1])),
  ...seedSources.flatMap((src) => [...src.matchAll(/(?:pokedexId|targetPokedexId|bossId):\s*(\d+)/g)].map((m) => Number(m[1]))),
]);

const getJson = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw new Error(`Request failed: ${url}`);
};

const cached = new Map();
const getCached = (url) => {
  if (!cached.has(url)) cached.set(url, getJson(url));
  return cached.get(url);
};

// Runs `fn` over `items` with limited parallelism
const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
};

const esName = (entity, fallback) => entity.names.find((n) => n.language.name === 'es')?.name ?? fallback;
const idFromUrl = (url) => Number(url.match(/\/(\d+)\/?$/)[1]);

// Non-level evolution methods mapped to the game's rules (level threshold or evolution stone)
const LEVEL_OVERRIDES = { 169: 35, 700: 15 };
const evolutionCondition = async (details, targetId) => {
  const stone = details.find((d) => d.trigger.name === 'use-item' && d.item);
  if (stone) return { minLevel: 1, requiredItem: esName(await getCached(stone.item.url), stone.item.name) };
  const byLevel = details.find((d) => d.trigger.name === 'level-up' && d.min_level);
  if (byLevel) return { minLevel: byLevel.min_level };
  if (LEVEL_OVERRIDES[targetId]) return { minLevel: LEVEL_OVERRIDES[targetId] };
  if (details.some((d) => d.trigger.name === 'trade')) return { minLevel: 36 };
  if (details.some((d) => d.min_happiness || d.min_affection)) return { minLevel: 25 };
  return { minLevel: 30 };
};

const evolutions = {};
const speciesIds = new Set(seedIds);
const seenChains = new Set();
const walkChain = async (node) => {
  const fromId = idFromUrl(node.species.url);
  speciesIds.add(fromId);
  for (const child of node.evolves_to) {
    const toId = idFromUrl(child.species.url);
    (evolutions[fromId] ??= []).push({ targetId: toId, ...(await evolutionCondition(child.evolution_details, toId)) });
    await walkChain(child);
  }
};
for (const id of seedIds) {
  const species = await getCached(`${API}/pokemon-species/${id}`);
  if (seenChains.has(species.evolution_chain.url)) continue;
  seenChains.add(species.evolution_chain.url);
  await walkChain((await getCached(species.evolution_chain.url)).chain);
}
console.log(`${seedIds.size} seed species -> ${speciesIds.size} species with their evolution families`);

const species = {};
const learnsets = {};
const moveSlugs = new Set();

await mapLimit([...speciesIds].sort((a, b) => a - b), 8, async (id) => {
  const [pokemon, speciesInfo] = await Promise.all([
    getCached(`${API}/pokemon/${id}`),
    getCached(`${API}/pokemon-species/${id}`),
  ]);
  const stat = (name) => pokemon.stats.find((s) => s.stat.name === name).base_stat;
  const mainAbility = pokemon.abilities.find((a) => !a.is_hidden) ?? pokemon.abilities[0];
  const flavor = [...speciesInfo.flavor_text_entries].reverse().find((f) => f.language.name === 'es');
  const name = esName(speciesInfo, pokemon.name);
  // Some recent species have no Spanish Pokédex entry yet: fall back to their category
  const genus = speciesInfo.genera.find((g) => g.language.name === 'es')?.genus;
  species[id] = {
    name,
    types: pokemon.types.map((t) => TYPE_ES[t.type.name]),
    baseStats: ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map(stat),
    ability: mainAbility ? esName(await getCached(mainAbility.ability.url), mainAbility.ability.name) : '',
    description: flavor
      ? flavor.flavor_text.replace(/\s+/g, ' ').trim()
      : genus
      ? `${name}, el ${genus}.`
      : '',
    evolutions: evolutions[id] ?? [],
  };

  let chosen = null;
  for (const vg of VERSION_GROUPS) {
    const entries = [];
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        if (d.version_group.name === vg && d.move_learn_method.name === 'level-up') {
          entries.push({ level: d.level_learned_at, move: m.move.name });
        }
      }
    }
    if (entries.length > 0) {
      chosen = { vg, entries };
      break;
    }
  }
  if (!chosen) {
    console.warn(`No level-up learnset for #${id}`);
    return;
  }
  chosen.entries.sort((a, b) => a.level - b.level || a.move.localeCompare(b.move));
  learnsets[id] = chosen.entries;
  chosen.entries.forEach((e) => moveSlugs.add(e.move));
});

const moves = {};
const moveData = await mapLimit([...moveSlugs].sort(), 8, (slug) => getCached(`${API}/move/${slug}`));
for (const m of moveData) {
  const slug = m.name;
  const nameEs = m.names.find((n) => n.language.name === 'es')?.name ?? slug;
  const flavor = [...m.flavor_text_entries].reverse().find((f) => f.language.name === 'es');
  const type = TYPE_ES[m.type.name];
  if (!type) {
    console.warn(`Skipping ${slug}: unsupported type ${m.type.name}`);
    continue;
  }
  const ailment = m.meta?.ailment?.name;
  const target = SELF_TARGETS.has(m.target.name) ? 'self' : AREA_TARGETS.has(m.target.name) ? 'all_enemies' : 'enemy';
  const statChanges = m.stat_changes
    .map((s) => ({ stat: STATS[s.stat.name], stages: s.change }))
    .filter((s) => s.stat);
  const metaCategory = m.meta?.category?.name;
  const statTarget =
    metaCategory === 'damage+raise' || (metaCategory !== 'damage+lower' && target === 'self') ? 'self' : 'target';
  moves[slug] = {
    id: `move_${slug.replace(/-/g, '_')}`,
    name: nameEs,
    type,
    category: m.damage_class.name,
    power: m.power ?? 0,
    accuracy: m.accuracy ?? 100,
    pp: m.pp ?? 10,
    maxPp: m.pp ?? 10,
    description: flavor ? flavor.flavor_text.replace(/\s+/g, ' ').trim() : nameEs,
    ...(AILMENTS.has(ailment) ? { statusEffect: ailment, statusChance: m.meta?.ailment_chance || 100 } : {}),
    ...(m.meta?.healing > 0 ? { healPercent: m.meta.healing } : {}),
    ...(target !== 'enemy' ? { target } : {}),
    ...(statChanges.length > 0
      ? { statChanges, statTarget, statChance: m.meta?.stat_chance || 100 }
      : {}),
  };
}

// Drop learnset entries whose move could not be mapped
for (const id of Object.keys(learnsets)) {
  learnsets[id] = learnsets[id].filter((e) => moves[e.move]);
}

const out = `// Generated by scripts/generate-learnsets.mjs from PokéAPI. Do not edit by hand.
import { Move } from '../types/game';

/** Official move data (Spanish names) keyed by PokéAPI slug. */
export const LEARNSET_MOVES: Record<string, Move> = ${JSON.stringify(moves, null, 2)};

/** Official level-up learnsets by Pokédex number. Level 0 = learned on evolution. */
export const LEARNSETS: Record<number, { level: number; move: string }[]> = ${JSON.stringify(learnsets, null, 2)};
`;

writeFileSync(join(root, 'src/data/learnsets.ts'), out);
console.log(`Wrote ${Object.keys(learnsets).length} learnsets and ${Object.keys(moves).length} moves.`);

const sortedSpecies = Object.fromEntries(Object.keys(species).sort((a, b) => a - b).map((id) => [id, species[id]]));
const speciesOut = `// Generated by scripts/generate-learnsets.mjs from PokéAPI. Do not edit by hand.
import { PokemonType } from '../types/game';

export interface SpeciesEvolution {
  targetId: number;
  minLevel: number;
  requiredItem?: string;
}

export interface SpeciesData {
  name: string;
  types: PokemonType[];
  /** [PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad] */
  baseStats: [number, number, number, number, number, number];
  ability: string;
  description: string;
  evolutions: SpeciesEvolution[];
}

/** Official data (Spanish) for every species in the game and its whole evolution family. */
export const SPECIES_DATA: Record<number, SpeciesData> = ${JSON.stringify(sortedSpecies, null, 2)};
`;
writeFileSync(join(root, 'src/data/speciesData.ts'), speciesOut);
console.log(`Wrote ${Object.keys(species).length} species.`);
