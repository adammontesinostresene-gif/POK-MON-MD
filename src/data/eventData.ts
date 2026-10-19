import { FloorEvent, FloorEventType, Dungeon, Pokemon, Item } from '../types/game';
import { BATTLE_ORBS, createWildEnemy, EXTRA_RECRUITS, getPmdPortraitUrl, ORAN_BERRY, randomEvolutionItem, SITRUS_BERRY, STATUS_BERRIES } from './pokemonData';

// Items that can show up in the "choose one of three" floor event
export const FLOOR_ITEM_POOL: Omit<Item, 'id' | 'count'>[] = [
  ORAN_BERRY,
  SITRUS_BERRY,
  ...STATUS_BERRIES,
  ...BATTLE_ORBS,
  { name: 'Manzana Grande', category: 'food', description: 'Recupera 50 de Hambre/Tripa.', effectType: 'restore_belly', effectValue: 50, icon: '🍏' },
  { name: 'Semilla Revivir', category: 'seed', description: 'Revive inmediatamente a un Pokémon caído.', effectType: 'revive', effectValue: 100, icon: '🌰' },
  { name: 'Semilla Sueño', category: 'seed', description: 'Duerme al Pokémon rival durante varios turnos.', effectType: 'inflict_status', effectValue: 3, icon: '💤' },
  { name: 'Elixir', category: 'healing', description: 'Restaura 10 PP de un movimiento.', effectType: 'restore_pp', effectValue: 10, icon: '🧪' },
  { name: 'Fugaesfera', category: 'orb', description: 'Permite salir inmediatamente de la mazmorra conservando objetos y oro.', effectType: 'escape', effectValue: 1, icon: '🔮' },
];

export const generateRandomFloorItem = (): Item => {
  const template = FLOOR_ITEM_POOL[Math.floor(Math.random() * FLOOR_ITEM_POOL.length)];
  return {
    ...template,
    id: `path_item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    count: 1,
  };
};

/**
 * Determines enemy squad size (1, 2, 3, or 4), same for every dungeon:
 * 1 enemy: 60%
 * 2 enemies: 30%
 * 3 enemies: 8%
 * 4 enemies: 2%
 * (a dungeon can override this with `squadSizeOdds`)
 */
export const getWildEnemiesCount = (isMonsterHouse: boolean = false, squadSizeOdds?: number[]): number => {
  if (isMonsterHouse) {
    const roll = Math.random();
    if (roll < 0.20) return 2;
    if (roll < 0.65) return 3;
    return 4;
  }

  const roll = Math.random();
  if (squadSizeOdds) {
    let acc = 0;
    const idx = squadSizeOdds.findIndex((p) => roll < (acc += p));
    return (idx === -1 ? squadSizeOdds.length - 1 : idx) + 1;
  }
  if (roll < 0.60) return 1;
  if (roll < 0.90) return 2;
  if (roll < 0.98) return 3;
  return 4;
};

export const generateEnemySquad = (
  dungeon: Dungeon,
  baseLevel: number,
  count: number
): Pokemon[] => {
  const squad: Pokemon[] = [];
  const pool = dungeon.enemiesPool && dungeon.enemiesPool.length > 0
    ? dungeon.enemiesPool
    : ['caterpie', 'pidgey', 'rattata'];

  for (let i = 0; i < count; i++) {
    const weightOf = (key: string) => dungeon.enemyWeights?.[key] ?? 1;
    let roll = Math.random() * pool.reduce((sum, key) => sum + weightOf(key), 0);
    const enemyKey = pool.find((key) => (roll -= weightOf(key)) < 0) ?? pool[pool.length - 1];
    let levelVariation = Math.max(1, baseLevel + (Math.floor(Math.random() * 3) - 1));
    if (dungeon.id === 'bosquejo_tutorial') {
      levelVariation = Math.min(3, Math.max(2, levelVariation));
    }
    if (dungeon.enemyLevelRange) {
      const [minLevel, maxLevel] = dungeon.enemyLevelRange;
      levelVariation = Math.min(maxLevel, Math.max(minLevel, levelVariation));
    }
    const wild = createWildEnemy(enemyKey, levelVariation);
    wild.id = `${wild.id}_sq_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    squad.push(wild);
  }

  return squad;
};

export const generateFloorEvent = (
  dungeon: Dungeon,
  floorNumber: number
): FloorEvent => {
  // If it's the final floor, trigger the climatic Boss Event
  if (floorNumber >= dungeon.floorsCount) {
    const bossLevel = dungeon.bossLevel ?? dungeon.recommendedLevel + 3;
    const bossCount = dungeon.bossCount ?? 1;
    const bosses = Array.from({ length: bossCount }, (_, i) => {
      const boss = createWildEnemy(dungeon.bossId, bossLevel);
      boss.id = `boss_${i}_${boss.id}`;
      return boss;
    });
    const boss = bosses[0];
    return {
      floorNumber,
      type: 'boss',
      title:
        bossCount > 1
          ? `¡Piso Final: ${bossCount} ${boss.name} bloquean la salida!`
          : `¡Piso Final: Encuentro con ${boss.name}!`,
      description:
        bossCount > 1
          ? `Una manada de ${bossCount} ${boss.name} defiende el último piso. ¡Es la prueba final de esta mazmorra!`
          : `Una imponente presencia estremece las paredes del piso ${floorNumber}. ¡Es el jefe de esta mazmorra!`,
      enemy: boss,
      enemies: bosses,
      dialogueSpeaker: boss.name,
      speakerPortrait: boss.artworkUrl,
    };
  }

  // 50% battle (a Monster House is a rare kind of battle), 50% one of the other events with equal odds
  const otherEvents: FloorEventType[] = ['decision', 'kecleon', 'chest', 'spring', 'item_choice'];
  const eventType: FloorEventType =
    Math.random() < 0.5
      ? !dungeon.squadSizeOdds && Math.random() < 0.15
        ? 'monster_house'
        : 'combat'
      : otherEvents[Math.floor(Math.random() * otherEvents.length)];

  let enemyLevel = dungeon.recommendedLevel + Math.floor((floorNumber - 1) / 2);
  if (dungeon.id === 'bosquejo_tutorial') {
    enemyLevel = Math.min(3, Math.max(2, 2 + Math.floor((floorNumber - 1) / 1.5)));
  }

  if (eventType === 'combat') {
    const count = getWildEnemiesCount(false, dungeon.squadSizeOdds);
    const enemies = generateEnemySquad(dungeon, enemyLevel, count);
    const leadEnemy = enemies[0];

    const title =
      count === 1
        ? `Piso ${floorNumber}: ¡Emboscada!`
        : `Piso ${floorNumber}: ¡Emboscada de Grupo (${count} Enemigos)!`;

    const description =
      count === 1
        ? `Al doblar la esquina de un pasadizo rocoso, ¡un ${leadEnemy.name} territorial salta para defender su territorio!`
        : `¡Cuidado! Una horda de ${count} Pokémon (${enemies.map((e) => e.name).join(', ')}) bloquea el camino!`;

    return {
      floorNumber,
      type: 'combat',
      title,
      description,
      enemy: leadEnemy,
      enemies,
      dialogueSpeaker: leadEnemy.name,
      speakerPortrait: leadEnemy.artworkUrl,
    };
  }

  if (eventType === 'decision' || eventType === 'kecleon') {
    const decisionTypes = [
      {
        title: `Piso ${floorNumber}: La Bifurcación Misteriosa`,
        description: 'Tres caminos se abren ante ti. Elige por dónde continuar.',
        choices: [
          {
            id: 'path_center',
            text: 'Tomar el camino del centro',
            actionKey: 'choose_path' as const,
          },
          {
            id: 'path_left',
            text: 'Tomar el camino de la izquierda',
            actionKey: 'choose_path' as const,
          },
          {
            id: 'path_right',
            text: 'Tomar el camino de la derecha',
            actionKey: 'choose_path' as const,
          },
        ],
      },
      {
        id: 'kecleon_bazaar',
        speaker: 'Kecleon',
        portrait: getPmdPortraitUrl(352),
        title: `Piso ${floorNumber}: El Puesto Ambulante de Kecleon`,
        description: `¡Qué fortuna! El mercader Kecleon ha desplegado su alfombra de objetos en esta sala segura. Te saluda con una amplia sonrisa.`,
        choices: [
          {
            id: 'buy_oran',
            text: 'Comprar Baya Aranja (Cuesta 80 Pokécuartos)',
            hint: 'Restaura 100 PS en momentos críticos',
            actionKey: 'buy_item' as const,
          },
          {
            id: 'buy_reviver',
            text: 'Comprar Semilla Revivir (Cuesta 220 Pokécuartos)',
            hint: 'Seguro de vida vital para la expedición',
            actionKey: 'buy_item' as const,
          },
          {
            id: 'greet_kecleon',
            text: 'Saludar educadamente y continuar',
            hint: 'Avanzas pacíficamente hacia las escaleras',
            actionKey: 'avoid_trap' as const,
          },
        ],
      },
    ];

    const chosenDilemma: { title: string; description: string; choices: typeof decisionTypes[number]['choices']; speaker?: string; portrait?: string } =
      decisionTypes[eventType === 'kecleon' ? 1 : 0];
    return {
      floorNumber,
      type: 'decision',
      title: chosenDilemma.title,
      description: chosenDilemma.description,
      choices: chosenDilemma.choices,
      dialogueSpeaker: chosenDilemma.speaker,
      speakerPortrait: chosenDilemma.portrait,
    };
  }

  if (eventType === 'item_choice') {
    const shuffled = [...FLOOR_ITEM_POOL].sort(() => Math.random() - 0.5);
    const itemChoices: Item[] = shuffled.slice(0, 3).map((template, i) => ({
      ...template,
      id: `floor_item_${i}_${Date.now()}`,
      count: 1,
    }));
    // Evolution items are rare finds (never sold in the shop)
    if (Math.random() < 0.2) itemChoices[2] = randomEvolutionItem();
    return {
      floorNumber,
      type: 'item_choice',
      title: `Piso ${floorNumber}: Objetos Encontrados`,
      description: `Encuentras tres objetos tirados en el suelo, pero solo hay sitio para llevarte uno. ¿Cuál eliges?`,
      itemChoices,
    };
  }

  if (eventType === 'spring') {
    return {
      floorNumber,
      type: 'spring',
      title: `Piso ${floorNumber}: Manantial Curativo`,
      description: `Brotan aguas cristalinas tibias ricas en minerales mágicos. El vapor suave calma la fatiga de tus Pokémon.`,
      reward: {
        message: '¡Todos los miembros del equipo han recuperado todos sus PS y PP! Tu estómago se siente reconfortado (+40 Hambre).',
      },
    };
  }

  if (eventType === 'chest') {
    return {
      floorNumber,
      type: 'chest',
      title: `Piso ${floorNumber}: Cofre del tesoro`,
      description: `En un pedestal antiguo encuentras un cofre sellado intacto abandonado por un equipo de rescate anterior.`,
      reward: {
        gold: 150 + floorNumber * 40,
        message: `¡Dentro encontraste ${150 + floorNumber * 40} Pokécuartos y provisiones frescas!`,
      },
    };
  }

  if (eventType === 'monster_house') {
    const count = getWildEnemiesCount(true); // 2, 3, or 4 enemies
    const enemies = generateEnemySquad(dungeon, enemyLevel + 1, count);
    const leadEnemy = enemies[0];
    return {
      floorNumber,
      type: 'monster_house',
      title: `Piso ${floorNumber}: ¡¡Alerta de Sala de Monstruos (${count} Enemigos)!!`,
      description: `¡Has pisado una baldosa trampa! El suelo vibra y un grupo de ${count} Pokémon (${enemies.map((e) => e.name).join(', ')}) salta desde las sombras.`,
      enemy: leadEnemy,
      enemies,
      dialogueSpeaker: leadEnemy.name,
      speakerPortrait: leadEnemy.artworkUrl,
    };
  }

  // Fallback combat
  const fallbackCount = getWildEnemiesCount(false, dungeon.squadSizeOdds);
  const fallbackEnemies = generateEnemySquad(dungeon, enemyLevel, fallbackCount);
  const leadEnemy = fallbackEnemies[0];
  return {
    floorNumber,
    type: 'combat',
    title: fallbackCount === 1 ? `Piso ${floorNumber}: Desafío Territorial` : `Piso ${floorNumber}: Grupo Rival (${fallbackCount} Enemigos)`,
    description: fallbackCount === 1
      ? `Un ${leadEnemy.name} se interpone firmemente en el pasadizo hacia el siguiente nivel.`
      : `Un grupo de ${fallbackCount} Pokémon (${fallbackEnemies.map((e) => e.name).join(', ')}) bloquea el avance del equipo.`,
    enemy: leadEnemy,
    enemies: fallbackEnemies,
    dialogueSpeaker: leadEnemy.name,
    speakerPortrait: leadEnemy.artworkUrl,
  };
};

export const getRandomRecruit = (): Pokemon => {
  const recruit = EXTRA_RECRUITS[Math.floor(Math.random() * EXTRA_RECRUITS.length)];
  return {
    ...recruit,
    id: `${recruit.id}_${Date.now()}`,
  };
};
