import { FloorEvent, FloorEventType, Dungeon, Pokemon } from '../types/game';
import { createWildEnemy, EXTRA_RECRUITS, getPmdPortraitUrl } from './pokemonData';

/**
 * Determines enemy squad size (1, 2, 3, or 4) with exact requested probabilities:
 * 1 enemy: 60%
 * 2 enemies: 25%
 * 3 enemies: 10%
 * 4 enemies: 5%
 */
export const getWildEnemiesCount = (isMonsterHouse: boolean = false): number => {
  if (isMonsterHouse) {
    const roll = Math.random();
    if (roll < 0.20) return 2;
    if (roll < 0.65) return 3;
    return 4;
  }

  const roll = Math.random();
  if (roll < 0.60) return 1;
  if (roll < 0.85) return 2;
  if (roll < 0.95) return 3;
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
    const enemyKey = pool[Math.floor(Math.random() * pool.length)];
    let levelVariation = Math.max(1, baseLevel + (Math.floor(Math.random() * 3) - 1));
    if (dungeon.id === 'bosque_misterioso') {
      levelVariation = Math.min(4, Math.max(2, levelVariation));
    }
    const wild = createWildEnemy(enemyKey, levelVariation);
    wild.id = `${wild.id}_sq_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    squad.push(wild);
  }

  return squad;
};

export const generateFloorEvent = (
  dungeon: Dungeon,
  floorNumber: number,
  playerTeam: Pokemon[]
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
          : `Una imponente presencia estremece las paredes del piso ${floorNumber}. ¡Es el soberano de esta mazmorra!`,
      enemy: boss,
      enemies: bosses,
      dialogueSpeaker: boss.name,
      speakerPortrait: boss.artworkUrl,
    };
  }

  // Every non-boss floor rolls a random event (repeated entries act as weights)
  const types: FloorEventType[] = ['combat', 'decision', 'combat', 'decision', 'chest', 'spring', 'monster_house'];
  const eventType = types[Math.floor(Math.random() * types.length)];

  let enemyLevel = dungeon.recommendedLevel + Math.floor((floorNumber - 1) / 2);
  if (dungeon.id === 'bosque_misterioso') {
    enemyLevel = Math.min(4, Math.max(2, 2 + Math.floor((floorNumber - 1) / 1.5)));
  }

  if (eventType === 'combat') {
    const count = getWildEnemiesCount(false);
    const enemies = generateEnemySquad(dungeon, enemyLevel, count);
    const leadEnemy = enemies[0];

    const title =
      count === 1
        ? `Piso ${floorNumber}: ¡Emboscada!`
        : `Piso ${floorNumber}: ¡Emboscada de Grupo (${count} Enemigos)!`;

    const description =
      count === 1
        ? `Al doblar la esquina de un pasadizo rocoso, ¡un ${leadEnemy.name} territorial salta para defender su territorio!`
        : `¡Cuidado! Una horda de ${count} Pokémon (${enemies.map((e) => e.name).join(', ')}) bloquea el camino en formación hostil.`;

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

  if (eventType === 'decision') {
    const decisionTypes = [
      {
        title: `Piso ${floorNumber}: La Bifurcación Misteriosa`,
        description: `El camino se divide en dos galerías. A la izquierda, un sendero iluminado por musgo brillante y bayas del bosque. A la derecha, un túnel resonante donde se oyen ecos metálicos de un cofre.`,
        choices: [
          {
            id: 'path_berries',
            text: 'Seguir el sendero vegetal iluminado',
            hint: 'Recuperas 25 de Hambre y encuentras bayas',
            actionKey: 'rest_carefully' as const,
          },
          {
            id: 'path_treasure',
            text: 'Aventurarse en el túnel resonante',
            hint: 'Posible gran tesoro o trampa de rocas',
            actionKey: 'explore_tunnel' as const,
          },
          {
            id: 'path_electric',
            text: playerTeam.some(p => p.types.includes('Eléctrico'))
              ? '⚡ Canalizar electricidad en las runas de la pared (Bonus Eléctrico)'
              : 'Inspeccionar las runas con cautela',
            hint: 'Activa un mecanismo arcano con éxito garantizado',
            actionKey: 'force_lock' as const,
          },
        ],
      },
      {
        id: 'rescued_friend',
        title: `Piso ${floorNumber}: El Compañero en Apuros`,
        description: `Entre unos escombros descubres a un Pokémon errante exhausto. Te mira con ojitos suplicantes pidiendo algo para recuperar sus fuerzas.`,
        choices: [
          {
            id: 'give_berry_friend',
            text: 'Ofrecerle una Baya Aranja de tu mochila',
            hint: 'Gasta 1 Baya Aranja pero ¡podría unirse a tu equipo!',
            actionKey: 'give_berry' as const,
          },
          {
            id: 'share_encouragement',
            text: 'Animarlo con palabras y ayudarlo a salir',
            hint: 'Te agradece con 150 Pokécuartos de recompensa',
            actionKey: 'avoid_trap' as const,
          },
          {
            id: 'hurry_on',
            text: 'Priorizar tu misión y seguir adelante',
            hint: 'No gastas recursos pero el camino sigue solitario',
            actionKey: 'rest_carefully' as const,
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
            hint: 'Restaura 50 PS en momentos críticos',
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
      decisionTypes[Math.floor(Math.random() * decisionTypes.length)];
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

  if (eventType === 'spring') {
    return {
      floorNumber,
      type: 'spring',
      title: `Piso ${floorNumber}: Manantial Curativo Subterráneo`,
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
      title: `Piso ${floorNumber}: Alijo de Explorador Perdido`,
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
  const fallbackCount = getWildEnemiesCount(false);
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
