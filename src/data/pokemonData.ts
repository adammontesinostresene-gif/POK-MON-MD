import { Pokemon, PokemonType, Dungeon, Item, RescueMission, Move } from '../types/game';

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
  },
  Siniestro: {
    Psíquico: 2.0,
    Fantasma: 2.0,
    Lucha: 0.5,
    Siniestro: 0.5,
  },
};

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
};

// Starter Hero Pikachu
export const createPikachuStarter = (): Pokemon => ({
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
});

// Initial Reserve Pokemons for the user to try Drag and Drop team modifications
export const INITIAL_RESERVES: Pokemon[] = [
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

// Potential Recruits that can appear or join during events
export const EXTRA_RECRUITS: Pokemon[] = [
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

// Dungeon Templates
export const DUNGEONS: Dungeon[] = [
  {
    id: 'bosque_misterioso',
    name: 'Bosque Místico',
    description: 'Un espeso bosque cubierto de niebla esmeralda. Abundan los Pokémon tipo Planta, Bicho y Volador.',
    floorsCount: 5,
    difficulty: 'Fácil',
    theme: 'forest',
    bgImage: '/src/assets/images/pmd_dungeon_forest_1792068605705.jpg',
    recommendedLevel: 2,
    enemiesPool: ['caterpie', 'pidgey', 'weedle', 'oddish', 'bellsprout'],
    bossId: 'boss_butterfree',
    rewards: {
      gold: 350,
      exp: 150,
      items: ['Baya Aranja', 'Manzana Grande', 'Semilla Revivir'],
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
    enemiesPool: ['geodude', 'zubat', 'machop', 'magnemite', 'diglett'],
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
  const configs: Record<string, { pokedexId: number; name: string; types: PokemonType[]; hp: number; atk: number; def: number; spa: number; spd: number; spe: number; moves: string[] }> = {
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
    // Bosses
    boss_butterfree: {
      pokedexId: 12,
      name: 'Butterfree Guardián (Jefe)',
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
      name: 'Onix Titánico (Jefe)',
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
      name: 'Zapdos Ancestral (Jefe Supremo)',
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
  const scaledHp = Math.round(c.hp * (1 + (level - 5) * 0.1));
  const scaledAtk = Math.round(c.atk * (1 + (level - 5) * 0.08));
  const scaledDef = Math.round(c.def * (1 + (level - 5) * 0.08));
  const scaledSpa = Math.round(c.spa * (1 + (level - 5) * 0.08));
  const scaledSpd = Math.round(c.spd * (1 + (level - 5) * 0.08));
  const scaledSpe = Math.round(c.spe * (1 + (level - 5) * 0.08));

  return {
    id: `enemy_${enemyType}_${Date.now()}_${Math.random()}`,
    pokedexId: c.pokedexId,
    name: c.name,
    level,
    exp: 0,
    nextExp: 50,
    types: c.types,
    stats: {
      hp: scaledHp,
      maxHp: scaledHp,
      attack: scaledAtk,
      defense: scaledDef,
      spAttack: scaledSpa,
      spDefense: scaledSpd,
      speed: scaledSpe,
    },
    ability: 'Presión',
    status: 'none',
    statusTurns: 0,
    spriteUrl: getPokemonSprite(c.pokedexId),
    artworkUrl: getPokemonArtwork(c.pokedexId),
    iconUrl: getPokemonStaticSprite(c.pokedexId),
    description: 'Un Pokémon territorial que vigila las profundidades de la mazmorra.',
    moves: c.moves.map((mName, idx) => {
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
    dungeonId: 'bosque_misterioso',
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
  statGains: {
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

export const EVOLUTION_REGISTRY: Record<number, EvolutionOption[]> = {
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
      minLevel: 16,
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
      minLevel: 32,
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
      minLevel: 32,
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

  // 133: Eevee -> Vaporeon (134), Jolteon (135), Flareon (136)
  133: [
    {
      targetPokedexId: 134,
      targetName: 'Vaporeon',
      minLevel: 15,
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
      minLevel: 15,
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
      minLevel: 15,
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

/**
 * Returns available evolution options for a Pokémon. Empty array if final form.
 */
export const getEvolutionOptions = (pokedexId: number): EvolutionOption[] => {
  return EVOLUTION_REGISTRY[pokedexId] || [];
};

/**
 * Checks whether a given Pokemon meets the requirements to evolve
 */
export const canPokemonEvolve = (
  pokemon: Pokemon
): {
  hasEvolutions: boolean;
  canEvolve: boolean;
  options: EvolutionOption[];
  minLevelRequired: number;
  levelDeficit: number;
} => {
  const options = getEvolutionOptions(pokemon.pokedexId);
  if (options.length === 0) {
    return {
      hasEvolutions: false,
      canEvolve: false,
      options: [],
      minLevelRequired: 0,
      levelDeficit: 0,
    };
  }

  const minLevelRequired = options[0].minLevel;
  const canEvolve = pokemon.level >= minLevelRequired;
  const levelDeficit = Math.max(0, minLevelRequired - pokemon.level);

  return {
    hasEvolutions: true,
    canEvolve,
    options,
    minLevelRequired,
    levelDeficit,
  };
};

/**
 * Executes the evolution transformation, updating stats, types, moves, and metadata
 */
export const evolvePokemon = (
  pokemon: Pokemon,
  chosenOption: EvolutionOption
): Pokemon => {
  const newMaxHp = pokemon.stats.maxHp + chosenOption.statGains.hp;
  const newHp = Math.min(newMaxHp, pokemon.stats.hp + chosenOption.statGains.hp);

  // Updated moves: add or replace if learnedMove exists
  let newMoves = [...pokemon.moves];
  if (chosenOption.learnedMove) {
    const alreadyHas = newMoves.some((m) => m.name === chosenOption.learnedMove!.name);
    if (!alreadyHas) {
      if (newMoves.length < 4) {
        newMoves.push(chosenOption.learnedMove);
      } else {
        // Replace last move
        newMoves[newMoves.length - 1] = chosenOption.learnedMove;
      }
    }
  }

  return {
    ...pokemon,
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
      attack: pokemon.stats.attack + chosenOption.statGains.attack,
      defense: pokemon.stats.defense + chosenOption.statGains.defense,
      spAttack: pokemon.stats.spAttack + chosenOption.statGains.spAttack,
      spDefense: pokemon.stats.spDefense + chosenOption.statGains.spDefense,
      speed: pokemon.stats.speed + chosenOption.statGains.speed,
    },
    moves: newMoves,
  };
};
