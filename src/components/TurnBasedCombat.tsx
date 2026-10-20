import React, { useState, useEffect, useRef } from 'react';
import { Pokemon, Move, Item, PokemonType, BattleStat, StatChange, StatusAilment } from '../types/game';
import { TYPE_COLORS, getTypeEffectiveness, getExpToNextLevel, applyOfficialStats, learnLevelUpMoves, replaceMove, bagSpace, ORAN_BERRY } from '../data/pokemonData';
import { LEARNSET_MOVES } from '../data/learnsets';
import {
  ABSORB_ABILITIES,
  CONTACT_AILMENTS,
  CONTACT_RECOIL,
  abilityAccuracyMultiplier,
  abilityAlwaysHits,
  abilityAttackMultiplier,
  abilityBlocksAilment,
  abilityBlocksNonSuperEffective,
  abilityBlocksSecondary,
  abilityBlocksStatDrop,
  abilityConvertsMove,
  abilityCritChance,
  abilityCritMultiplier,
  abilityDefenseMultiplier,
  abilityIgnoresBurn,
  abilityIgnoresGhostImmunity,
  abilityIgnoresParalysisSlow,
  abilityPriority,
  abilitySecondaryChanceMultiplier,
  abilitySpeedMultiplier,
  abilityStab,
  abilityStageFactor,
  abilitySurvivesAtFullHp,
  getAbilityId,
  getAbilityName,
} from '../data/abilities';
import { soundManager } from '../utils/audio';
import {
  Shield,
  Sparkles,
  Heart,
  Zap,
  Backpack,
  ArrowLeft,
  Award,
  FastForward,
  UserPlus,
  Users,
  Swords,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Crosshair
} from 'lucide-react';
import { PmdSprite, PmdPortrait } from './PmdSprite';
import { CoopCombatAction, CoopInput, seededRandom } from '../utils/coop';

// Global damage tuning for all attacks (player and enemies)
const DAMAGE_MULTIPLIER = 1.35;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Typeless, unlimited basic attack available to every member (never consumes PP)
const BASIC_ATTACK: Move = {
  id: 'move_basic_attack',
  name: 'Ataque Básico',
  type: 'Normal',
  category: 'physical',
  power: 30,
  accuracy: 100,
  pp: 1,
  maxPp: 1,
  description: 'Golpe sin tipo que se puede usar siempre.',
};

const isTypeless = (move: Move) => move.id === BASIC_ATTACK.id;

const OFFICIAL_MOVES_BY_ID = new Map(Object.values(LEARNSET_MOVES).map((m) => [m.id, m]));

// Official effect data (also covers moves stored in older saves) or the legacy boost flags
const withEffects = (move: Move): Move => {
  const official = OFFICIAL_MOVES_BY_ID.get(move.id);
  if (official) {
    return {
      ...move,
      target: official.target,
      healPercent: official.healPercent,
      statChanges: official.statChanges,
      statTarget: official.statTarget,
      statChance: official.statChance,
      statusEffect: official.statusEffect,
      statusChance: official.statusChance,
    };
  }
  if (move.statusEffect === 'attack_boost' || move.statusEffect === 'defense_boost') {
    return {
      ...move,
      target: move.power > 0 ? move.target : 'self',
      statChanges: [{ stat: move.statusEffect === 'attack_boost' ? 'attack' : 'defense', stages: 1 }],
      statTarget: 'self',
      statChance: 100,
    };
  }
  return move;
};

const STAT_LABELS: Record<BattleStat, { name: string; short: string; article: 'El' | 'La' }> = {
  attack: { name: 'Ataque', short: 'Atq', article: 'El' },
  defense: { name: 'Defensa', short: 'Def', article: 'La' },
  spAttack: { name: 'Ataque Especial', short: 'AtE', article: 'El' },
  spDefense: { name: 'Defensa Especial', short: 'DfE', article: 'La' },
  speed: { name: 'Velocidad', short: 'Vel', article: 'La' },
  accuracy: { name: 'Precisión', short: 'Pre', article: 'La' },
  evasion: { name: 'Evasión', short: 'Eva', article: 'La' },
};

// Official stage multipliers (stages range from -6 to +6)
const stageMultiplier = (stage: number) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));
const accuracyMultiplier = (stage: number) => (stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage));

type StageMap = Record<string, Partial<Record<BattleStat, number>>>;

type Ailment = Exclude<StatusAilment, 'none'>;
type AilmentMap = Record<string, { status: Ailment; turns: number }>;

const AILMENT_LABELS: Record<Ailment, { short: string; className: string; inflicted: string }> = {
  paralysis: { short: 'PAR', className: 'bg-yellow-500 text-yellow-950', inflicted: 'está paralizado. ¡Quizás no pueda moverse!' },
  burn: { short: 'QUE', className: 'bg-orange-600 text-white', inflicted: 'se ha quemado.' },
  poison: { short: 'ENV', className: 'bg-purple-600 text-white', inflicted: 'ha sido envenenado.' },
  sleep: { short: 'DOR', className: 'bg-slate-500 text-white', inflicted: 'se ha dormido.' },
  freeze: { short: 'CON', className: 'bg-cyan-400 text-cyan-950', inflicted: 'ha sido congelado.' },
};

const getMoveAilment = (move: Move): Ailment | undefined =>
  move.statusEffect && move.statusEffect in AILMENT_LABELS ? (move.statusEffect as Ailment) : undefined;

const isImmuneToAilment = (p: Pokemon, ailment: Ailment) =>
  (ailment === 'paralysis' && p.types.includes('Eléctrico')) ||
  (ailment === 'burn' && p.types.includes('Fuego')) ||
  (ailment === 'poison' && (p.types.includes('Veneno') || p.types.includes('Acero'))) ||
  (ailment === 'freeze' && p.types.includes('Hielo'));

// A level-up move that didn't fit because the Pokémon already knows 4
interface PendingLearn {
  memberId: string;
  memberName: string;
  move: Move;
}

/** Multiplayer link: every client replays the rounds committed by the host with the same seed. */
export interface CoopCombatLink {
  combatId: string;
  seed: string;
  localUid: string;
  isHost: boolean;
  // Owner uid of every slot of `playerTeam`
  owners: string[];
  activeUids: string[];
  names: Record<string, string>;
  rounds: CoopCombatAction[][];
  decisions: Record<string, string | null>;
  actionInputs: Record<string, CoopInput | undefined>;
  decisionInputs: Record<string, CoopInput | undefined>;
  submit: (channel: 'combat' | 'decision', key: string, data: unknown) => void;
  commitRound: (round: number, actions: CoopCombatAction[]) => void;
  commitDecision: (key: string, value: string | null) => void;
}

interface TurnBasedCombatProps {
  playerTeam: Pokemon[];
  enemy?: Pokemon;
  enemies?: Pokemon[];
  inventory: Item[];
  bgImage: string;
  onVictory: (
    updatedTeam: Pokemon[],
    expGained: number,
    goldGained: number,
    droppedItem?: Item,
    recruitedPokemon?: Pokemon,
    addToActiveTeam?: boolean,
    recruiterUid?: string
  ) => void;
  onDefeat: () => void;
  onEscapeDungeon: (team: Pokemon[], inventory: Item[]) => void;
  canUseEscapeOrb?: boolean;
  onUpdateInventory: (items: Item[]) => void;
  coop?: CoopCombatLink;
}

interface QueuedAction {
  actorId: string;
  actorName: string;
  isPlayerTeam: boolean;
  memberIndex?: number;
  speed: number;
  priority: number;
  move: Move;
  targetId: string;
}

export const TurnBasedCombat: React.FC<TurnBasedCombatProps> = ({
  playerTeam,
  enemy: initialEnemy,
  enemies: initialEnemiesProp,
  inventory,
  bgImage,
  onVictory,
  onDefeat,
  onEscapeDungeon,
  canUseEscapeOrb = true,
  onUpdateInventory,
  coop,
}) => {
  // Every random roll goes through here so co-op clients stay in sync
  const rngRef = useRef<() => number>(Math.random);
  const rand = () => rngRef.current();
  const ownerOf = (memberId: string) => coop?.owners[playerTeam.findIndex((p) => p.id === memberId)] ?? '';
  const playerName = (uid: string) => coop?.names[uid] ?? 'Explorador';
  const roundKey = (round: number) => `${coop?.combatId}:${round}`;
  // Rounds of the host's list already replayed on this client
  const executedRoundsRef = useRef(0);
  const [executedRounds, setExecutedRounds] = useState(0);
  // Lets a co-op player change an action already sent
  const [editingAction, setEditingAction] = useState(false);
  const [learnsResolved, setLearnsResolved] = useState(0);
  // Normalize initial enemies: accept array of 1 to 4 enemies, or single enemy
  const initialEnemies: Pokemon[] =
    initialEnemiesProp && initialEnemiesProp.length > 0
      ? initialEnemiesProp
      : initialEnemy
      ? [initialEnemy]
      : [];

  // Team and enemy squad state
  const [team, setTeam] = useState<Pokemon[]>(playerTeam);
  const [enemies, setEnemies] = useState<Pokemon[]>(initialEnemies);

  // Alive members in team order
  const aliveMembers = team.filter((m) => m.stats.hp > 0);
  const aliveEnemies = enemies.filter((e) => e.stats.hp > 0);

  // Target chosen per member when confirming each move
  const [memberTargetMap, setMemberTargetMap] = useState<Record<string, string>>({});

  // Combat sub-menus:
  // 'MOVES_SELECT': sequential per-member move selection (Team Order: Member 0, Member 1, ...)
  // 'MAIN_MENU': overall options (Attack, Bag)
  // 'BAG': inventory selection
  // 'BAG_TARGET': target for item
  // 'BAG_MOVE': move to restore with an Elixir
  // 'BAG_ENEMY': rival targeted by an offensive item
  const [combatMenu, setCombatMenu] = useState<'MOVES_SELECT' | 'MAIN_MENU' | 'BAG' | 'BAG_TARGET' | 'BAG_MOVE' | 'BAG_ENEMY'>('MOVES_SELECT');

  // Multi-member move selection state:
  // Tracks which member in aliveMembers is currently picking their move (index 0, 1, 2, ...)
  const [selectingMemberIndex, setSelectingMemberIndex] = useState<number>(0);
  // Stores chosen moves for each alive member: key is member.id, value is chosen Move
  const [chosenMoves, setChosenMoves] = useState<Record<string, Move>>({});
  // If a member picks a move that targets an enemy and >1 enemy is alive, stores pending move for target selection
  const [pendingMoveChoice, setPendingMoveChoice] = useState<{ member: Pokemon; move: Move } | null>(null);

  // Item usage state
  const [selectedBagItem, setSelectedBagItem] = useState<Item | null>(null);
  const [elixirTargetIdx, setElixirTargetIdx] = useState<number | null>(null);
  // Members who spent this round's action on an item (member.id -> item name)
  const [itemUsers, setItemUsers] = useState<Record<string, string>>({});

  // Turn execution states & feedback
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);
  const [currentActingActorId, setCurrentActingActorId] = useState<string | null>(null);
  const [battleLogs, setBattleLogs] = useState<string[]>(() => {
    if (initialEnemies.length > 1) {
      return [
        `¡Ha aparecido un grupo de ${initialEnemies.length} rivales (${initialEnemies.map((e) => e.name).join(', ')})! Elige los ataques de cada miembro del equipo.`,
      ];
    }
    return [
      `¡Ha aparecido ${initialEnemies[0]?.name || 'un rival'}! Elige los ataques de cada miembro del equipo.`,
    ];
  });

  // Per-member & per-enemy animation state
  const [attackingMemberId, setAttackingMemberId] = useState<string | null>(null);
  const [hitMemberId, setHitMemberId] = useState<string | null>(null);
  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);
  const [hitEnemyId, setHitEnemyId] = useState<string | null>(null);

  // Floating damage numbers: targetId can be member id or enemy id
  const [floatingDamage, setFloatingDamage] = useState<{
    targetId: string;
    text: string;
    type: 'damage' | 'heal' | 'status' | 'miss';
  } | null>(null);

  // Speed order for display during turn execution
  const [currentExecutionQueue, setCurrentExecutionQueue] = useState<QueuedAction[]>([]);

  // Victory / Recruitment Modal State
  const [victoryState, setVictoryState] = useState<{
    isOpen: boolean;
    expGained: number;
    goldGained: number;
    droppedItem?: Item;
    recruitedPokemon?: Pokemon;
    leveledUpPokemon?: { name: string; oldLevel: number; newLevel: number; learned: string[] }[];
    pendingLearns: PendingLearn[];
    recruiterUid?: string;
  } | null>(null);

  // Play battle music on mount
  useEffect(() => {
    soundManager.startBgm('combat');
    return () => {
      soundManager.stopBgm();
    };
  }, []);

  // Stat stages live only inside this battle (the component remounts for every floor fight)
  const stagesRef = useRef<StageMap>({});
  const [statStages, setStatStages] = useState<StageMap>({});
  const ailmentsRef = useRef<AilmentMap>({});
  const [ailments, setAilments] = useState<AilmentMap>({});
  // Remaining confused turns per Pokémon id
  const confusionRef = useRef<Record<string, number>>({});
  const [confusion, setConfusionState] = useState<Record<string, number>>({});

  const setConfusion = (id: string, turns: number | null) => {
    const next = { ...confusionRef.current };
    if (turns) next[id] = turns;
    else delete next[id];
    confusionRef.current = next;
    setConfusionState(next);
  };

  const setAilment = (id: string, value: AilmentMap[string] | null) => {
    const next = { ...ailmentsRef.current };
    if (value) next[id] = value;
    else delete next[id];
    ailmentsRef.current = next;
    setAilments(next);
  };

  const abilityOf = (p: Pokemon) => getAbilityId(p);

  // Intimidate lowers the rivals' Attack as the battle begins
  const battleStartRef = useRef(false);
  useEffect(() => {
    if (battleStartRef.current) return;
    battleStartRef.current = true;
    const messages: string[] = [];
    const sides = [
      { side: playerTeam, foes: initialEnemies },
      { side: initialEnemies, foes: playerTeam },
    ];
    for (const { side, foes } of sides) {
      for (const p of side) {
        if (p.stats.hp <= 0 || abilityOf(p) !== 'intimidate') continue;
        messages.push(`¡${getAbilityName('intimidate')} de ${p.name} amedrenta a los rivales!`);
        for (const foe of foes) {
          if (foe.stats.hp <= 0) continue;
          const foeAbility = abilityOf(foe);
          if (abilityBlocksStatDrop(foeAbility, 'attack')) {
            messages.push(`¡${getAbilityName(foeAbility)} de ${foe.name} evita que baje su Ataque!`);
            continue;
          }
          const stage = Math.max(-6, Math.min(6, getStage(foe.id, 'attack') - abilityStageFactor(foeAbility)));
          stagesRef.current = { ...stagesRef.current, [foe.id]: { ...stagesRef.current[foe.id], attack: stage } };
        }
      }
    }
    if (messages.length > 0) {
      setStatStages(stagesRef.current);
      setBattleLogs((prev) => [...prev, ...messages].slice(-8));
    }
  }, []);

  // Inventory synchronization ref for turn execution
  const currentInventoryRef = useRef<Item[]>(inventory);
  useEffect(() => {
    currentInventoryRef.current = inventory;
  }, [inventory]);

  /**
   * Automatic Reviver Seed activation (PMD mechanic):
   * When any ally's HP drops to 0, if there is a Reviver Seed in the backpack,
   * it is instantly consumed, the ally is revived to 100% HP, cured of ailments,
   * and negative stat debuffs are cleared.
   */
  const tryTriggerReviverSeed = async (
    member: Pokemon,
    teamArray: Pokemon[],
    memberIndex: number
  ): Promise<boolean> => {
    const inv = currentInventoryRef.current;
    const seedIndex = inv.findIndex(
      (it) =>
        (it.effectType === 'revive' || it.name.toLowerCase().includes('revivir')) &&
        it.count > 0
    );
    if (seedIndex === -1) {
      return false;
    }

    const seedItem = inv[seedIndex];
    // Deduct 1 seed from inventory
    const updatedInv = inv
      .map((it, idx) => (idx === seedIndex ? { ...it, count: it.count - 1 } : it))
      .filter((it) => it.count > 0);

    currentInventoryRef.current = updatedInv;
    onUpdateInventory(updatedInv);

    // Full revival to 100% HP, reset status
    const revived: Pokemon = {
      ...member,
      stats: {
        ...member.stats,
        hp: member.stats.maxHp,
      },
      status: 'none',
      statusTurns: 0,
    };
    teamArray[memberIndex] = revived;
    setTeam([...teamArray]);

    // Clear ailment & debuffs
    setAilment(member.id, null);
    if (stagesRef.current[member.id]) {
      const cleaned = { ...stagesRef.current[member.id] };
      for (const st of Object.keys(cleaned) as BattleStat[]) {
        if ((cleaned[st] ?? 0) < 0) cleaned[st] = 0;
      }
      stagesRef.current[member.id] = cleaned;
      setStatStages({ ...stagesRef.current });
    }

    // Authentic PMD dialogue & feedback
    addLog(`✨ ¡La ${seedItem.name} de la mochila se activó al instante!`);
    soundManager.playLevelUp();
    setFloatingDamage({ targetId: member.id, text: '¡REVIVIR!', type: 'heal' });
    await wait(350);
    soundManager.playHeal();
    addLog(`💖 ¡${member.name} revivió con todos sus PS recuperados!`);
    await wait(450);
    setFloatingDamage(null);

    return true;
  };

  // Safe reference to the current selecting member (in co-op, always this player's own leader)
  const currentMember: Pokemon | undefined = coop
    ? aliveMembers.find((m) => ownerOf(m.id) === coop.localUid)
    : aliveMembers[selectingMemberIndex] || aliveMembers[0];

  const addLog = (msg: string) => {
    setBattleLogs((prev) => [...prev.slice(-7), msg]);
    soundManager.playTextBlip();
  };

  const getStage = (id: string, stat: BattleStat) => stagesRef.current[id]?.[stat] ?? 0;

  const effectiveStat = (p: Pokemon, stat: 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed') => {
    const ailment = ailmentsRef.current[p.id]?.status;
    const ability = abilityOf(p);
    const speedMult =
      stat === 'speed'
        ? abilitySpeedMultiplier(ability, ailment) *
          (ailment === 'paralysis' && !abilityIgnoresParalysisSlow(ability) ? 0.5 : 1)
        : 1;
    return p.stats[stat] * stageMultiplier(getStage(p.id, stat)) * speedMult;
  };

  const canReceiveAilment = (target: Pokemon, ailment: Ailment) =>
    !ailmentsRef.current[target.id] &&
    !isImmuneToAilment(target, ailment) &&
    !abilityBlocksAilment(abilityOf(target), ailment);

  // Returns true when the target ends up with the new ailment
  const applyAilment = async (target: Pokemon, ailment: Ailment, announceFailure: boolean) => {
    if (!canReceiveAilment(target, ailment)) {
      if (announceFailure) {
        const targetAbility = abilityOf(target);
        addLog(
          ailmentsRef.current[target.id]
            ? `¡Pero no afectó a ${target.name}! Ya sufre un problema de estado.`
            : abilityBlocksAilment(targetAbility, ailment)
            ? `¡${getAbilityName(targetAbility)} de ${target.name} lo protege!`
            : `No afecta a ${target.name}...`
        );
        await wait(450);
      }
      return false;
    }
    setAilment(target.id, { status: ailment, turns: ailment === 'sleep' ? 1 + Math.floor(rand() * 3) : 0 });
    addLog(`¡${target.name} ${AILMENT_LABELS[ailment].inflicted}`);
    setFloatingDamage({ targetId: target.id, text: AILMENT_LABELS[ailment].short, type: 'status' });
    soundManager.playHit();
    await wait(550);
    setFloatingDamage(null);
    return true;
  };

  // Sleep, freeze and paralysis can stop the actor before using its move
  const checkAilmentCanAct = async (actor: Pokemon) => {
    const current = ailmentsRef.current[actor.id];
    if (!current) return true;
    if (current.status === 'sleep') {
      if (current.turns > 0) {
        setAilment(actor.id, { status: 'sleep', turns: current.turns - 1 });
        addLog(`💤 ${actor.name} está profundamente dormido.`);
        await wait(550);
        return false;
      }
      setAilment(actor.id, null);
      addLog(`¡${actor.name} se despertó!`);
      await wait(400);
      return true;
    }
    if (current.status === 'freeze') {
      if (rand() < 0.2) {
        setAilment(actor.id, null);
        addLog(`¡${actor.name} se ha descongelado!`);
        await wait(400);
        return true;
      }
      addLog(`🧊 ${actor.name} está congelado.`);
      await wait(550);
      return false;
    }
    if (current.status === 'paralysis' && rand() < 0.25) {
      addLog(`⚡ ¡${actor.name} está paralizado! No se puede mover.`);
      await wait(550);
      return false;
    }
    return true;
  };

  // Confusion (from Ofuscosfera) can coexist with an ailment; a confused Pokémon may hurt itself
  const checkConfusion = async (actor: Pokemon, onSelfHit: () => void) => {
    const turns = confusionRef.current[actor.id];
    if (!turns) return true;
    if (turns <= 1) {
      setConfusion(actor.id, null);
      addLog(`¡${actor.name} ya no está confuso!`);
      await wait(400);
      return true;
    }
    setConfusion(actor.id, turns - 1);
    addLog(`💫 ${actor.name} está confuso...`);
    await wait(350);
    if (rand() >= 1 / 3) return true;
    // Self-hits never knock out, so fainting stays handled in one place
    const dmg = Math.min(actor.stats.hp - 1, Math.max(1, Math.floor(actor.stats.maxHp / 8)));
    if (dmg > 0) actor.stats.hp -= dmg;
    onSelfHit();
    addLog(`¡Está tan confuso que se hirió a sí mismo!`);
    setFloatingDamage({ targetId: actor.id, text: `-${Math.max(0, dmg)}`, type: 'damage' });
    soundManager.playHit();
    await wait(550);
    setFloatingDamage(null);
    return false;
  };

  const checkCanAct = async (actor: Pokemon, onSelfHit: () => void) =>
    (await checkAilmentCanAct(actor)) && (await checkConfusion(actor, onSelfHit));

  const moveHits = (attacker: Pokemon, defender: Pokemon, move: Move) => {
    if (abilityAlwaysHits(abilityOf(attacker), abilityOf(defender))) return true;
    const stage = Math.max(-6, Math.min(6, getStage(attacker.id, 'accuracy') - getStage(defender.id, 'evasion')));
    return (
      rand() * 100 <
      move.accuracy * accuracyMultiplier(stage) * abilityAccuracyMultiplier(abilityOf(attacker), move)
    );
  };

  // byFoe: the change comes from a rival, so abilities like Cuerpo Puro can block drops
  const applyStatChanges = async (target: Pokemon, changes: StatChange[], byFoe = false) => {
    const ability = abilityOf(target);
    const factor = abilityStageFactor(ability);
    for (const change of changes) {
      const label = STAT_LABELS[change.stat];
      if (byFoe && change.stages < 0 && abilityBlocksStatDrop(ability, change.stat)) {
        addLog(`¡${getAbilityName(ability)} de ${target.name} evita que baje su ${label.name}!`);
        await wait(450);
        continue;
      }
      const stages = change.stages * factor;
      const current = getStage(target.id, change.stat);
      const next = Math.max(-6, Math.min(6, current + stages));
      const rising = stages > 0;
      if (next === current) {
        addLog(`¡${label.article} ${label.name} de ${target.name} no puede ${rising ? 'subir' : 'bajar'} más!`);
      } else {
        stagesRef.current = {
          ...stagesRef.current,
          [target.id]: { ...stagesRef.current[target.id], [change.stat]: next },
        };
        setStatStages(stagesRef.current);
        const amount = Math.abs(next - current);
        const intensity = amount >= 3 ? ' muchísimo' : amount === 2 ? ' mucho' : '';
        addLog(`¡${label.article} ${label.name} de ${target.name} ${rising ? 'subió' : 'bajó'}${intensity}!`);
        setFloatingDamage({ targetId: target.id, text: `${label.short} ${rising ? '↑' : '↓'}`, type: 'status' });
        if (rising) soundManager.playHeal();
        else soundManager.playHit();
      }
      await wait(500);
    }
    setFloatingDamage(null);
  };

  const renderStages = (id: string) => {
    const stages = Object.entries(statStages[id] ?? {}).filter(([, v]) => v);
    const ailment = ailments[id]?.status;
    const isConfused = !!confusion[id];
    if (stages.length === 0 && !ailment && !isConfused) return null;
    return (
      <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
        {isConfused && (
          <span className="text-[7px] sm:text-[8px] font-mono font-bold px-0.5 rounded leading-tight bg-fuchsia-600 text-white">
            CNF
          </span>
        )}
        {ailment && (
          <span
            className={`text-[7px] sm:text-[8px] font-mono font-bold px-0.5 rounded leading-tight ${AILMENT_LABELS[ailment].className}`}
          >
            {AILMENT_LABELS[ailment].short}
          </span>
        )}
        {stages.map(([stat, v]) => (
          <span
            key={stat}
            className={`text-[7px] sm:text-[8px] font-mono font-bold px-0.5 rounded leading-tight ${
              v! > 0 ? 'bg-emerald-700/90 text-emerald-100' : 'bg-red-800/90 text-red-100'
            }`}
          >
            {STAT_LABELS[stat as BattleStat].short}
            {v! > 0 ? `+${v}` : v}
          </span>
        ))}
      </div>
    );
  };

  // Helper for damage calculation
  const calculateDamage = (attacker: Pokemon, defender: Pokemon, move: Move) => {
    if (move.category === 'status') {
      return { damage: 0, effectiveness: 1, isCrit: false };
    }

    const isPhysical = move.category === 'physical';
    const atkStat = effectiveStat(attacker, isPhysical ? 'attack' : 'spAttack');
    const defStat = effectiveStat(defender, isPhysical ? 'defense' : 'spDefense');
    const attackerAbility = abilityOf(attacker);
    const defenderAbility = abilityOf(defender);
    const attackerAilment = ailmentsRef.current[attacker.id]?.status;

    const defTypes = abilityIgnoresGhostImmunity(attackerAbility, move)
      ? defender.types.filter((t) => t !== 'Fantasma')
      : defender.types;
    const effectiveness = isTypeless(move) ? 1 : getTypeEffectiveness(move.type, defTypes);
    const stab = !isTypeless(move) && attacker.types.includes(move.type) ? abilityStab(attackerAbility) : 1.0;
    const variance = 0.85 + rand() * 0.15;
    const isCrit = rand() < abilityCritChance(attackerAbility, defenderAbility);
    const critMult = isCrit ? abilityCritMultiplier(attackerAbility) : 1.0;
    const burnMult =
      isPhysical && attackerAilment === 'burn' && !abilityIgnoresBurn(attackerAbility) ? 0.5 : 1.0;
    const abilityMult =
      abilityAttackMultiplier(attackerAbility, attacker, move, effectiveness, attackerAilment) *
      abilityDefenseMultiplier(defenderAbility, defender, move, effectiveness, ailmentsRef.current[defender.id]?.status);

    const baseDmg =
      ((2 * attacker.level / 5 + 2) * move.power * (atkStat / Math.max(1, defStat)) / 50 + 2) *
      stab *
      effectiveness *
      critMult *
      burnMult *
      abilityMult *
      variance *
      DAMAGE_MULTIPLIER;

    return {
      damage: Math.max(1, Math.round(baseDmg)),
      effectiveness,
      isCrit,
    };
  };

  // Returns true when the target's ability negates the move (it may heal or get a boost instead)
  const resolveAbsorb = async (target: Pokemon, move: Move): Promise<boolean> => {
    const targetAbility = abilityOf(target);
    const absorb = targetAbility ? ABSORB_ABILITIES[targetAbility] : undefined;
    if (!absorb || isTypeless(move) || absorb.type !== move.type) return false;
    addLog(`¡${getAbilityName(targetAbility)} de ${target.name} anula ${move.name}!`);
    if (absorb.effect.kind === 'heal' && target.stats.hp < target.stats.maxHp) {
      const heal = Math.max(1, Math.floor(target.stats.maxHp / 4));
      target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal);
      soundManager.playHeal();
      setFloatingDamage({ targetId: target.id, text: `+${heal} PS`, type: 'heal' });
      await wait(500);
      setFloatingDamage(null);
    } else if (absorb.effect.kind === 'boost') {
      await applyStatChanges(target, [{ stat: absorb.effect.stat, stages: absorb.effect.stages }]);
    } else {
      await wait(450);
    }
    return true;
  };

  const applySturdy = (target: Pokemon, damage: number) =>
    abilitySurvivesAtFullHp(abilityOf(target)) &&
    target.stats.maxHp > 1 &&
    target.stats.hp >= target.stats.maxHp &&
    damage >= target.stats.hp
      ? { damage: target.stats.hp - 1, endured: true }
      : { damage, endured: false };

  // Abilities triggered by physical hits (Elec. Estática, Piel Tosca, Toque Tóxico...); mutates HP in place
  const applyContactAbilities = async (attacker: Pokemon, target: Pokemon, move: Move) => {
    if (move.category !== 'physical') return;
    const targetAbility = abilityOf(target);
    const attackerAbility = abilityOf(attacker);
    if (attacker.stats.hp > 0 && targetAbility) {
      const ailments = CONTACT_AILMENTS[targetAbility];
      const ailment = ailments?.[Math.floor(rand() * ailments.length)];
      if (ailment && rand() < 0.3 && canReceiveAilment(attacker, ailment)) {
        addLog(`¡${getAbilityName(targetAbility)} de ${target.name} se activa!`);
        await applyAilment(attacker, ailment, false);
      }
      const recoil = CONTACT_RECOIL[targetAbility];
      if (recoil && attackerAbility !== 'magic-guard') {
        const dmg = Math.max(1, Math.floor(attacker.stats.maxHp * recoil));
        attacker.stats.hp = Math.max(0, attacker.stats.hp - dmg);
        addLog(`¡${attacker.name} se hiere con ${getAbilityName(targetAbility)} de ${target.name}!`);
        setFloatingDamage({ targetId: attacker.id, text: `-${dmg}`, type: 'damage' });
        soundManager.playHit();
        await wait(500);
        setFloatingDamage(null);
      }
    }
    if (attackerAbility === 'poison-touch' && target.stats.hp > 0 && rand() < 0.3 && canReceiveAilment(target, 'poison')) {
      addLog(`¡${getAbilityName(attackerAbility)} de ${attacker.name} se activa!`);
      await applyAilment(target, 'poison', false);
    }
  };

  const triggerMoxie = async (attacker: Pokemon) => {
    if (attacker.stats.hp <= 0 || abilityOf(attacker) !== 'moxie') return;
    addLog(`¡${getAbilityName('moxie')} de ${attacker.name} se activa!`);
    await applyStatChanges(attacker, [{ stat: 'attack', stages: 1 }]);
  };

  // Handle a team member choosing their move in team order
  const handleSelectMemberMove = (member: Pokemon, move: Move) => {
    soundManager.playSelect();

    // Self-buffs / self-heals target the user; area moves need no target
    const fx = withEffects(move);
    if (fx.healPercent || fx.target === 'self') {
      handleConfirmMemberAction(member, move, member.id);
      return;
    }
    if (fx.target === 'all_enemies') {
      handleConfirmMemberAction(member, move, aliveEnemies[0]?.id || '');
      return;
    }

    // If only 1 enemy is alive, immediately target that sole enemy
    if (aliveEnemies.length <= 1) {
      const soleEnemyId = aliveEnemies[0]?.id || '';
      handleConfirmMemberAction(member, move, soleEnemyId);
      return;
    }

    // When there is more than 1 enemy, require the player to select the specific target!
    setPendingMoveChoice({ member, move });
  };

  // Confirm both the action and the target for this team member
  const handleConfirmMemberAction = (member: Pokemon, move: Move, targetEnemyId: string) => {
    soundManager.playSelect();
    setPendingMoveChoice(null);

    if (coop) {
      const action: CoopCombatAction = { kind: 'move', memberId: member.id, moveId: move.id, targetId: targetEnemyId };
      coop.submit('combat', roundKey(executedRoundsRef.current), action);
      setChosenMoves({ [member.id]: move });
      setMemberTargetMap({ [member.id]: targetEnemyId });
      setEditingAction(false);
      return;
    }

    const updatedChosenMoves = {
      ...chosenMoves,
      [member.id]: move,
    };
    const updatedMemberTargets = {
      ...memberTargetMap,
      [member.id]: targetEnemyId,
    };

    setChosenMoves(updatedChosenMoves);
    setMemberTargetMap(updatedMemberTargets);

    // If there is another alive member after this one, advance to them in team order
    if (selectingMemberIndex < aliveMembers.length - 1) {
      setSelectingMemberIndex(selectingMemberIndex + 1);
    } else {
      // All alive team members have made their choice!
      // Resolve the turn in order of SPEED!
      executeSimultaneousRound(updatedChosenMoves, updatedMemberTargets);
    }
  };

  // Execute the combat round: All fighters act in order of SPEED (with priority taken into account)
  const executeSimultaneousRound = async (
    confirmedMoves: Record<string, Move>,
    confirmedTargets: Record<string, string>,
    teamOverride?: Pokemon[]
  ) => {
    if (isProcessingTurn) return;
    setIsProcessingTurn(true);

    let currentTeam = [...(teamOverride ?? team)];
    let currentEnemies = [...enemies];

    // Deduct PP for all chosen moves across team
    currentTeam = currentTeam.map((m) => {
      const chosen = confirmedMoves[m.id];
      if (!chosen) return m;
      return {
        ...m,
        moves: m.moves.map((mv) =>
          mv.id === chosen.id ? { ...mv, pp: Math.max(0, mv.pp - 1) } : mv
        ),
      };
    });
    setTeam([...currentTeam]);

    // Build the Action Queue
    const actionQueue: QueuedAction[] = [];

    // 1. Add each alive player member's action
    for (let i = 0; i < currentTeam.length; i++) {
      const member = currentTeam[i];
      if (member.stats.hp > 0 && confirmedMoves[member.id]) {
        const move = confirmedMoves[member.id];
        const assignedTarget = confirmedTargets[member.id] || aliveEnemies[0]?.id;
        actionQueue.push({
          actorId: member.id,
          actorName: member.name,
          isPlayerTeam: true,
          memberIndex: i,
          speed: effectiveStat(member, 'speed'),
          priority: (move.name === 'Ataque Rápido' ? 1 : 0) + abilityPriority(abilityOf(member), withEffects(move)),
          move,
          targetId: assignedTarget,
        });
      }
    }

    // 2. Add EACH alive enemy's chosen action
    for (let j = 0; j < currentEnemies.length; j++) {
      const enemyActor = currentEnemies[j];
      if (enemyActor.stats.hp > 0) {
        const randomEnemyMove =
          enemyActor.moves[Math.floor(rand() * enemyActor.moves.length)] || {
            id: 'enemy_tackle',
            name: 'Placaje Feroz',
            type: 'Normal' as PokemonType,
            category: 'physical' as const,
            power: 35,
            accuracy: 90,
            pp: 10,
            maxPp: 10,
            description: 'Ataque frontal.',
          };

        actionQueue.push({
          actorId: enemyActor.id,
          actorName: enemyActor.name,
          isPlayerTeam: false,
          memberIndex: j,
          speed: effectiveStat(enemyActor, 'speed'),
          priority:
            (randomEnemyMove.name === 'Ataque Rápido' ? 1 : 0) +
            abilityPriority(abilityOf(enemyActor), withEffects(randomEnemyMove)),
          move: randomEnemyMove,
          targetId: 'player_target',
        });
      }
    }

    // 3. SORT ALL ACTIONS: PRIORITY FIRST, THEN SPEED DESCENDING!
    actionQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.speed - a.speed;
    });

    setCurrentExecutionQueue(actionQueue);
    addLog('¡Comienza el turno!');
    await new Promise((r) => setTimeout(r, 450));

    // 4. EXECUTE ACTIONS IN SPEED ORDER
    for (const action of actionQueue) {
      setCurrentActingActorId(action.actorId);

      // Check if all enemies have already fainted
      if (currentEnemies.every((e) => e.stats.hp <= 0)) {
        break;
      }

      if (action.isPlayerTeam) {
        // Player team member attacks
        const member = currentTeam[action.memberIndex!];
        if (!member || member.stats.hp <= 0) {
          // Fainted before acting
          continue;
        }

        const move = abilityConvertsMove(abilityOf(member), withEffects(action.move));
        const ailment = getMoveAilment(move);
        if (
          !(await checkCanAct(member, () => {
            currentTeam[action.memberIndex!] = { ...member };
            setTeam([...currentTeam]);
          }))
        )
          continue;

        // Self-targeted move: healing and/or own stat changes
        if (move.target === 'self' || move.healPercent) {
          addLog(`✨ ${member.name} usa ${move.name}!`);
          setAttackingMemberId(member.id);
          await wait(220);
          setAttackingMemberId(null);

          if (move.healPercent) {
            soundManager.playHeal();
            const healAmount = Math.round((member.stats.maxHp * move.healPercent) / 100);
            member.stats.hp = Math.min(member.stats.maxHp, member.stats.hp + healAmount);
            currentTeam[action.memberIndex!] = { ...member };
            setTeam([...currentTeam]);
            setFloatingDamage({ targetId: member.id, text: `+${healAmount} PS`, type: 'heal' });
            await wait(550);
            setFloatingDamage(null);
          }
          if (move.statChanges) await applyStatChanges(member, move.statChanges);
          continue;
        }

        // Offensive move: find target enemy. If original target fainted, retarget next alive enemy!
        let targetEnemy = currentEnemies.find((e) => e.id === action.targetId && e.stats.hp > 0);
        if (!targetEnemy) {
          targetEnemy = currentEnemies.find((e) => e.stats.hp > 0);
        }
        if (!targetEnemy) break; // All enemies down

        const targetEnemyIdx = currentEnemies.findIndex((e) => e.id === targetEnemy.id);
        const isAreaMove = move.target === 'all_enemies';
        const isFieldStatus = move.power === 0 && isAreaMove;

        addLog(
          isAreaMove
            ? `⚡ ${member.name} usa ${move.name}!`
            : `⚡ ${member.name} usa ${move.name} contra ${targetEnemy.name}!`
        );

        if (move.power > 0) {
          if (move.type === 'Eléctrico') soundManager.playElectricShock();
          else soundManager.playTackle();
        }

        setAttackingMemberId(member.id);
        await wait(220);
        setAttackingMemberId(null);

        // Status move: stat changes on the target (or every rival for field-wide moves)
        if (move.power === 0) {
          const targets = isFieldStatus ? currentEnemies.filter((e) => e.stats.hp > 0) : [targetEnemy];
          if (!move.statChanges && !ailment) {
            addLog('¡Pero no pasó nada!');
            await wait(400);
            continue;
          }
          for (const t of targets) {
            if (!moveHits(member, t, move)) {
              addLog(`¡${t.name} esquivó ${move.name}!`);
              setFloatingDamage({ targetId: t.id, text: 'Fallo', type: 'miss' });
              await wait(450);
              setFloatingDamage(null);
              continue;
            }
            if (await resolveAbsorb(t, move)) {
              const absorbedIdx = currentEnemies.findIndex((e) => e.id === t.id);
              currentEnemies[absorbedIdx] = { ...t };
              setEnemies([...currentEnemies]);
              continue;
            }
            if (move.statChanges) await applyStatChanges(t, move.statChanges, true);
            if (ailment) {
              if (getTypeEffectiveness(move.type, t.types) === 0) {
                addLog(`No afecta a ${t.name}...`);
                await wait(450);
              } else {
                await applyAilment(t, ailment, true);
              }
            }
          }
          continue;
        }

        // Damaging move: one target, or every rival for area moves (official 0.75x when several are hit)
        const hitTargets = isAreaMove ? currentEnemies.filter((e) => e.stats.hp > 0) : [targetEnemy];
        const spreadMult = hitTargets.length > 1 ? 0.75 : 1;
        let selfBoostDone = false;
        for (const t of hitTargets) {
          const tIdx = isAreaMove ? currentEnemies.findIndex((e) => e.id === t.id) : targetEnemyIdx;
          if (!moveHits(member, t, move)) {
            addLog(`¡${t.name} esquivó el ataque!`);
            setFloatingDamage({ targetId: t.id, text: 'Fallo', type: 'miss' });
            await wait(550);
            setFloatingDamage(null);
            continue;
          }

          if (await resolveAbsorb(t, move)) {
            currentEnemies[tIdx] = { ...t };
            setEnemies([...currentEnemies]);
            continue;
          }
          const { damage: rawDamage, effectiveness, isCrit } = calculateDamage(member, t, move);
          if (abilityBlocksNonSuperEffective(abilityOf(t), effectiveness)) {
            addLog(`¡${getAbilityName(abilityOf(t))} de ${t.name} lo protege del ataque!`);
            await wait(450);
            continue;
          }
          const { damage, endured } = applySturdy(t, Math.max(1, Math.round(rawDamage * spreadMult)));
          setHitEnemyId(t.id);
          soundManager.playHit();
          setFloatingDamage({ targetId: t.id, text: `-${damage}`, type: 'damage' });

          t.stats.hp = Math.max(0, t.stats.hp - damage);
          currentEnemies[tIdx] = { ...t };
          setEnemies([...currentEnemies]);

          await wait(250);
          setHitEnemyId(null);

          if (isCrit) addLog(`¡Golpe crítico de ${member.name}!`);
          if (effectiveness > 1.0) addLog(`¡Ataque súper eficaz contra ${t.name}!`);
          if (effectiveness < 1.0 && effectiveness > 0) addLog(`No es muy eficaz contra ${t.name}...`);
          if (endured) addLog(`¡${t.name} aguantó el golpe gracias a ${getAbilityName(abilityOf(t))}!`);

          if (t.stats.hp <= 0) {
            addLog(`¡${t.name} cayó debilitado!`);
            soundManager.playHit();
          }

          await wait(450);
          setFloatingDamage(null);

          // Secondary effects (e.g. Ácido may lower Sp. Def); a self-boost only triggers once per use
          const secondaryMult = abilitySecondaryChanceMultiplier(abilityOf(member));
          const shielded = abilityBlocksSecondary(abilityOf(t));
          if (move.statChanges && rand() * 100 < (move.statChance ?? 100) * secondaryMult) {
            if (move.statTarget === 'self') {
              if (!selfBoostDone) await applyStatChanges(member, move.statChanges);
              selfBoostDone = true;
            } else if (t.stats.hp > 0 && !shielded) {
              await applyStatChanges(t, move.statChanges, true);
            }
          }
          if (ailment && t.stats.hp > 0 && !shielded && rand() * 100 < (move.statusChance ?? 30) * secondaryMult) {
            await applyAilment(t, ailment, false);
          }
          if (t.stats.hp <= 0) await triggerMoxie(member);

          await applyContactAbilities(member, t, move);
          currentTeam[action.memberIndex!] = { ...member };
          setTeam([...currentTeam]);
          if (member.stats.hp <= 0) {
            addLog(`¡${member.name} cayó debilitado!`);
            soundManager.playDefeat();
            await wait(350);
            await tryTriggerReviverSeed(member, currentTeam, action.memberIndex!);
            break;
          }
        }

        // Check if all enemies defeated
        if (currentEnemies.every((e) => e.stats.hp <= 0)) {
          await handleVictory(currentTeam, currentEnemies);
          setIsProcessingTurn(false);
          setCurrentActingActorId(null);
          setCurrentExecutionQueue([]);
          return;
        }
      } else {
        // ENEMY'S ACTION
        const enemyActor = currentEnemies[action.memberIndex!];
        if (!enemyActor || enemyActor.stats.hp <= 0) {
          // This enemy fainted before acting
          continue;
        }

        const move = abilityConvertsMove(abilityOf(enemyActor), withEffects(action.move));
        const ailment = getMoveAilment(move);
        if (
          !(await checkCanAct(enemyActor, () => {
            currentEnemies[action.memberIndex!] = { ...enemyActor };
            setEnemies([...currentEnemies]);
          }))
        )
          continue;

        if (move.target === 'self' || move.healPercent) {
          addLog(`✨ ¡${enemyActor.name} usa ${move.name}!`);
          setAttackingEnemyId(enemyActor.id);
          await wait(220);
          setAttackingEnemyId(null);

          if (move.healPercent) {
            soundManager.playHeal();
            const healAmount = Math.round((enemyActor.stats.maxHp * move.healPercent) / 100);
            enemyActor.stats.hp = Math.min(enemyActor.stats.maxHp, enemyActor.stats.hp + healAmount);
            currentEnemies[action.memberIndex!] = { ...enemyActor };
            setEnemies([...currentEnemies]);
            setFloatingDamage({ targetId: enemyActor.id, text: `+${healAmount} PS`, type: 'heal' });
            await wait(550);
            setFloatingDamage(null);
          }
          if (move.statChanges) await applyStatChanges(enemyActor, move.statChanges);
          continue;
        }

        const currentAlive = currentTeam.filter((m) => m.stats.hp > 0);
        if (currentAlive.length === 0) break;

        const targetMember = currentAlive[Math.floor(rand() * currentAlive.length)];
        const targetIdx = currentTeam.findIndex((m) => m.id === targetMember.id);
        const isAreaMove = move.target === 'all_enemies';
        const isFieldStatus = move.power === 0 && isAreaMove;

        addLog(
          isAreaMove
            ? `💥 ¡${enemyActor.name} usa ${move.name}!`
            : move.power > 0
            ? `💥 ¡${enemyActor.name} ataca a ${targetMember.name} con ${move.name}!`
            : `💥 ¡${enemyActor.name} usa ${move.name} contra ${targetMember.name}!`
        );

        setAttackingEnemyId(enemyActor.id);
        await wait(220);
        setAttackingEnemyId(null);

        if (move.power === 0) {
          if (!move.statChanges && !ailment) {
            addLog('¡Pero no pasó nada!');
            await wait(400);
            continue;
          }
          const targets = isFieldStatus ? currentAlive : [targetMember];
          for (const t of targets) {
            if (!moveHits(enemyActor, t, move)) {
              addLog(`¡${t.name} esquivó ${move.name}!`);
              setFloatingDamage({ targetId: t.id, text: 'Fallo', type: 'miss' });
              await wait(450);
              setFloatingDamage(null);
              continue;
            }
            if (await resolveAbsorb(t, move)) {
              const absorbedIdx = currentTeam.findIndex((m) => m.id === t.id);
              currentTeam[absorbedIdx] = { ...t };
              setTeam([...currentTeam]);
              continue;
            }
            if (move.statChanges) await applyStatChanges(t, move.statChanges, true);
            if (ailment) {
              if (getTypeEffectiveness(move.type, t.types) === 0) {
                addLog(`No afecta a ${t.name}...`);
                await wait(450);
              } else {
                await applyAilment(t, ailment, true);
              }
            }
          }
          continue;
        }

        const hitTargets = isAreaMove ? currentAlive : [targetMember];
        const spreadMult = hitTargets.length > 1 ? 0.75 : 1;
        let selfBoostDone = false;
        for (let t of hitTargets) {
          const tIdx = isAreaMove ? currentTeam.findIndex((m) => m.id === t.id) : targetIdx;
          if (!moveHits(enemyActor, t, move)) {
            addLog(`¡${t.name} esquivó el ataque!`);
            setFloatingDamage({ targetId: t.id, text: 'Fallo', type: 'miss' });
            await wait(550);
            setFloatingDamage(null);
            continue;
          }

          if (await resolveAbsorb(t, move)) {
            currentTeam[tIdx] = { ...t };
            setTeam([...currentTeam]);
            continue;
          }
          const { damage: rawDamage, effectiveness, isCrit } = calculateDamage(enemyActor, t, move);
          if (abilityBlocksNonSuperEffective(abilityOf(t), effectiveness)) {
            addLog(`¡${getAbilityName(abilityOf(t))} de ${t.name} lo protege del ataque!`);
            await wait(450);
            continue;
          }
          const { damage, endured } = applySturdy(t, Math.max(1, Math.round(rawDamage * spreadMult)));

          setHitMemberId(t.id);
          soundManager.playHit();
          setFloatingDamage({ targetId: t.id, text: `-${damage}`, type: 'damage' });

          t.stats.hp = Math.max(0, t.stats.hp - damage);
          currentTeam[tIdx] = { ...t };
          setTeam([...currentTeam]);

          await wait(250);
          setHitMemberId(null);

          if (isCrit) addLog(`¡Golpe crítico de ${enemyActor.name}!`);
          if (effectiveness > 1.0) addLog(`¡Ataque súper eficaz contra ${t.name}!`);
          if (effectiveness < 1.0 && effectiveness > 0) addLog(`No es muy eficaz contra ${t.name}...`);
          if (endured) addLog(`¡${t.name} aguantó el golpe gracias a ${getAbilityName(abilityOf(t))}!`);

          await wait(450);
          setFloatingDamage(null);

          const secondaryMult = abilitySecondaryChanceMultiplier(abilityOf(enemyActor));
          const shielded = abilityBlocksSecondary(abilityOf(t));
          if (move.statChanges && rand() * 100 < (move.statChance ?? 100) * secondaryMult) {
            if (move.statTarget === 'self') {
              if (!selfBoostDone) await applyStatChanges(enemyActor, move.statChanges);
              selfBoostDone = true;
            } else if (t.stats.hp > 0 && !shielded) {
              await applyStatChanges(t, move.statChanges, true);
            }
          }
          if (ailment && t.stats.hp > 0 && !shielded && rand() * 100 < (move.statusChance ?? 30) * secondaryMult) {
            await applyAilment(t, ailment, false);
          }
          if (t.stats.hp <= 0) await triggerMoxie(enemyActor);

          await applyContactAbilities(enemyActor, t, move);
          currentEnemies[action.memberIndex!] = { ...enemyActor };
          setEnemies([...currentEnemies]);
          if (enemyActor.stats.hp <= 0) {
            addLog(`¡${enemyActor.name} cayó debilitado!`);
            await wait(350);
          }

          if (t.stats.hp <= 0) {
            addLog(`¡${t.name} cayó debilitado!`);
            soundManager.playDefeat();
            await wait(350);

            // Instant Reviver Seed consumption from backpack
            const revived = await tryTriggerReviverSeed(t, currentTeam, tIdx);
            if (revived) {
              t = currentTeam[tIdx];
            }
          }
          if (enemyActor.stats.hp <= 0) break;
        }

        // Check if all team fainted
        if (currentTeam.every((m) => m.stats.hp <= 0)) {
          addLog(`¡Todo tu equipo ha sido debilitado!`);
          soundManager.playDefeat();
          await new Promise((r) => setTimeout(r, 1000));
          setIsProcessingTurn(false);
          onDefeat();
          return;
        }
      }
    }

    // End of round: burn and poison damage
    const residualTargets = [
      ...currentTeam.map((p, i) => ({ p, i, isPlayer: true })),
      ...currentEnemies.map((p, i) => ({ p, i, isPlayer: false })),
    ];
    for (const { p, i, isPlayer } of residualTargets) {
      const status = ailmentsRef.current[p.id]?.status;
      if (p.stats.hp <= 0 || (status !== 'burn' && status !== 'poison')) continue;
      const residualAbility = abilityOf(p);
      if (residualAbility === 'magic-guard') continue;
      if (status === 'poison' && residualAbility === 'poison-heal') {
        if (p.stats.hp >= p.stats.maxHp) continue;
        const heal = Math.max(1, Math.floor(p.stats.maxHp / 8));
        const healed = { ...p, stats: { ...p.stats, hp: Math.min(p.stats.maxHp, p.stats.hp + heal) } };
        if (isPlayer) {
          currentTeam[i] = healed;
          setTeam([...currentTeam]);
        } else {
          currentEnemies[i] = healed;
          setEnemies([...currentEnemies]);
        }
        addLog(`💚 ${p.name} recupera PS gracias a ${getAbilityName(residualAbility)}.`);
        setFloatingDamage({ targetId: p.id, text: `+${heal} PS`, type: 'heal' });
        soundManager.playHeal();
        await wait(550);
        setFloatingDamage(null);
        continue;
      }
      const dmg = Math.max(1, Math.floor(p.stats.maxHp / (status === 'burn' ? 16 : 8)));
      const updated = { ...p, stats: { ...p.stats, hp: Math.max(0, p.stats.hp - dmg) } };
      if (isPlayer) {
        currentTeam[i] = updated;
        setTeam([...currentTeam]);
      } else {
        currentEnemies[i] = updated;
        setEnemies([...currentEnemies]);
      }
      addLog(status === 'burn' ? `🔥 ${p.name} se resiente de la quemadura.` : `☠️ ${p.name} sufre los efectos del veneno.`);
      setFloatingDamage({ targetId: p.id, text: `-${dmg}`, type: 'damage' });
      soundManager.playHit();
      await wait(550);
      setFloatingDamage(null);
      if (updated.stats.hp <= 0) {
        addLog(`¡${p.name} cayó debilitado!`);
        await wait(350);
        if (isPlayer) {
          const revived = await tryTriggerReviverSeed(updated, currentTeam, i);
          if (revived) {
            // Member was revived with 100% HP
            currentTeam[i] = currentTeam[i];
          }
        }
      }
    }

    if (currentEnemies.every((e) => e.stats.hp <= 0)) {
      await handleVictory(currentTeam, currentEnemies);
      setIsProcessingTurn(false);
      setCurrentActingActorId(null);
      setCurrentExecutionQueue([]);
      return;
    }
    if (currentTeam.every((m) => m.stats.hp <= 0)) {
      addLog(`¡Todo tu equipo ha sido debilitado!`);
      soundManager.playDefeat();
      await wait(1000);
      setIsProcessingTurn(false);
      onDefeat();
      return;
    }

    // End-of-round abilities
    for (const p of [...currentTeam, ...currentEnemies]) {
      if (p.stats.hp <= 0) continue;
      const roundAbility = abilityOf(p);
      if (roundAbility === 'speed-boost') {
        addLog(`¡${getAbilityName(roundAbility)} de ${p.name} se activa!`);
        await applyStatChanges(p, [{ stat: 'speed', stages: 1 }]);
      } else if (roundAbility === 'shed-skin' && ailmentsRef.current[p.id] && rand() < 0.3) {
        setAilment(p.id, null);
        addLog(`¡${p.name} se curó de su problema de estado gracias a ${getAbilityName(roundAbility)}!`);
        await wait(450);
      }
    }

    // Reset chosen moves and restart selection for next round
    setCurrentActingActorId(null);
    setCurrentExecutionQueue([]);
    setChosenMoves({});
    setItemUsers({});
    setMemberTargetMap({});
    setPendingMoveChoice(null);
    setSelectingMemberIndex(0);
    setCombatMenu('MOVES_SELECT');
    setIsProcessingTurn(false);
  };

  // Handle victory and recruitment chance
  const handleVictory = async (finalTeam: Pokemon[], defeatedEnemies: Pokemon[]) => {
    soundManager.stopBgm();
    soundManager.playVictory();

    // Reward scales with the number and levels of all defeated enemies!
    const expReward = defeatedEnemies.reduce(
      (sum, e) => sum + Math.round(e.level * 7 + rand() * 4),
      0
    );
    // Loot roll: 50% nothing, otherwise either gold or an item (never both)
    const lootRoll = rand();
    const goldReward =
      lootRoll < 0.25
        ? defeatedEnemies.reduce((sum, e) => sum + Math.round(e.level * 9 + rand() * 10), 0)
        : 0;

    // Level-up checks for surviving team members: strictly ONE notification message per Pokémon
    const leveledMap = new Map<string, { name: string; oldLevel: number; newLevel: number; learned: string[] }>();
    const pendingLearns: PendingLearn[] = [];
    const updatedTeam = finalTeam.map((member) => {
      const initialLevel = member.level;
      let exp = member.exp + expReward;
      let level = member.level;
      let nextExp = member.nextExp;
      let stats = { ...member.stats };

      // At most one level per victory; surplus EXP is capped just below the next threshold
      if (exp >= nextExp) {
        exp -= nextExp;
        level += 1;
        nextExp = getExpToNextLevel(level);
        exp = Math.min(exp, nextExp - 1);

        // Boost stats upon leveling (official bases when available)
        const official = applyOfficialStats({ ...member, level, stats });
        if (official.stats !== stats) {
          stats = official.stats;
        } else {
          stats.maxHp += 4;
          stats.hp = Math.min(stats.maxHp, stats.hp + 4);
          stats.attack += 2;
          stats.defense += 2;
          stats.spAttack += 2;
          stats.spDefense += 2;
          stats.speed += 1;
        }
      }

      const leveledMember = { ...member, exp, level, nextExp, stats };
      if (level === initialLevel) return leveledMember;

      const { pokemon: withMoves, learned, pending } = learnLevelUpMoves(leveledMember);
      pending.forEach((move) =>
        pendingLearns.push({ memberId: member.id, memberName: member.name, move })
      );
      if (!leveledMap.has(member.id)) {
        leveledMap.set(member.id, { name: member.name, oldLevel: initialLevel, newLevel: level, learned });
      }
      return withMoves;
    });

    const leveledList = Array.from(leveledMap.values());

    setTeam(updatedTeam);

    // Pick one defeated enemy; it joins based on its own species recruit rate
    let potentialRecruit: Pokemon | undefined = undefined;
    const recruitCandidate =
      defeatedEnemies.length > 0
        ? defeatedEnemies[Math.floor(rand() * defeatedEnemies.length)]
        : undefined;
    if (recruitCandidate && rand() < (recruitCandidate.recruitRate ?? 0.65)) {
      potentialRecruit = {
        ...recruitCandidate,
        id: `${recruitCandidate.name.toLowerCase()}_recruit_${Date.now()}`,
        exp: 0,
        nextExp: getExpToNextLevel(recruitCandidate.level),
        status: 'none',
        stats: {
          ...recruitCandidate.stats,
          hp: recruitCandidate.stats.maxHp, // Recruited at full health!
        },
      };
    }

    let droppedItem: Item | undefined = undefined;
    if (lootRoll >= 0.25 && lootRoll < 0.5 && bagSpace(currentInventoryRef.current) > 0) {
      droppedItem = {
        ...ORAN_BERRY,
        id: `drop_oran_${Date.now()}`,
        count: 1,
      };
    }

    // In co-op, one random member gets the chance to recruit it
    const recruiterUid =
      coop && potentialRecruit ? coop.owners[Math.floor(rand() * coop.owners.length)] : undefined;

    setVictoryState({
      isOpen: true,
      expGained: expReward,
      goldGained: goldReward,
      droppedItem,
      recruitedPokemon: potentialRecruit,
      leveledUpPokemon: leveledList,
      pendingLearns,
      recruiterUid,
    });
  };

  // Applies an item's effect; returns the updated team, or null when an escape orb ends the expedition
  const applyItemEffect = (
    item: Item,
    user: Pokemon,
    teamArr: Pokemon[],
    targetIdx: number,
    moveIdx?: number,
    enemyId?: string
  ): Pokemon[] | null => {
    const bagItem = currentInventoryRef.current.find((it) => it.id === item.id && it.count > 0);
    const target = teamArr[targetIdx];
    if (!bagItem || !target || (item.effectType === 'heal_hp' && target.stats.hp <= 0)) {
      addLog(`🎒 ${user.name} buscó ${item.name} en la mochila... ¡pero no pudo usarlo!`);
      return teamArr;
    }

    const updatedInv = currentInventoryRef.current
      .map((it) => (it.id === item.id ? { ...it, count: it.count - 1 } : it))
      .filter((it) => it.count > 0);
    currentInventoryRef.current = updatedInv;
    onUpdateInventory(updatedInv);

    const targetMember = { ...target, stats: { ...target.stats } };

    if (!canUseEscapeOrb && item.category === 'orb') {
      soundManager.playHit();
      addLog(`🚫 ${user.name} usó ${item.name}... ¡pero no tuvo efecto contra el jefe!`);
    } else if (item.effectType === 'confuse_all') {
      const foes = enemies.filter((e) => e.stats.hp > 0 && !confusionRef.current[e.id]);
      foes.forEach((e) => setConfusion(e.id, 2 + Math.floor(rand() * 4)));
      soundManager.playSelect();
      addLog(
        foes.length > 0
          ? `🌀 ¡${user.name} usó ${item.name}! ${foes.map((f) => f.name).join(', ')} ${foes.length > 1 ? 'están confusos' : 'está confuso'}.`
          : `🌀 ${user.name} usó ${item.name}... ¡pero no tuvo efecto!`
      );
    } else if (item.effectType === 'speed_up_allies') {
      const allies = teamArr.filter((m) => m.stats.hp > 0);
      for (const ally of allies) {
        const next = Math.max(-6, Math.min(6, getStage(ally.id, 'speed') + (item.effectValue || 1) * abilityStageFactor(abilityOf(ally))));
        stagesRef.current = { ...stagesRef.current, [ally.id]: { ...stagesRef.current[ally.id], speed: next } };
      }
      setStatStages(stagesRef.current);
      soundManager.playHeal();
      addLog(`💨 ¡${user.name} usó ${item.name}! ¡La Velocidad de todo el equipo subió!`);
    } else if (item.effectType === 'heal_hp') {
      const before = targetMember.stats.hp;
      targetMember.stats.hp = Math.min(targetMember.stats.maxHp, before + (item.effectValue || 40));
      soundManager.playHeal();
      addLog(
        targetMember.stats.hp >= targetMember.stats.maxHp
          ? `✨ ¡${user.name} usó ${item.name} en ${targetMember.name}! Recuperó todos sus PS (+${targetMember.stats.hp - before}).`
          : `✨ ¡${user.name} usó ${item.name} en ${targetMember.name}! Recuperó ${targetMember.stats.hp - before} PS.`
      );
    } else if (item.effectType === 'revive') {
      targetMember.stats.hp = targetMember.stats.maxHp;
      targetMember.status = 'none';
      targetMember.statusTurns = 0;
      setAilment(targetMember.id, null);
      soundManager.playLevelUp();
      addLog(`⭐ ¡${user.name} revivió a ${targetMember.name} con ${item.name}! ¡Recuperó el 100% de sus PS!`);
    } else if (item.effectType === 'restore_pp' && moveIdx !== undefined && targetMember.moves[moveIdx]) {
      const mv = targetMember.moves[moveIdx];
      const restored = Math.min(mv.maxPp, mv.pp + (item.effectValue || 10)) - mv.pp;
      targetMember.moves = targetMember.moves.map((m, i) => (i === moveIdx ? { ...m, pp: m.pp + restored } : m));
      soundManager.playHeal();
      addLog(`🧪 ¡${user.name} usó ${item.name}! ${mv.name} de ${targetMember.name} recuperó ${restored} PP.`);
    } else if (item.effectType === 'escape') {
      soundManager.playSelect();
      addLog(`🌀 ¡${user.name} usó el Orbe Escape! El equipo sale de la mazmorra con todo su botín.`);
      setIsProcessingTurn(true);
      setCombatMenu('MOVES_SELECT');
      setSelectedBagItem(null);
      setTimeout(() => onEscapeDungeon(teamArr, updatedInv), 900);
      return null;
    } else if (item.effectType === 'inflict_status') {
      const foe =
        enemies.find((e) => e.id === enemyId && e.stats.hp > 0) ?? enemies.find((e) => e.stats.hp > 0);
      if (foe && !ailmentsRef.current[foe.id]) {
        setAilment(foe.id, { status: 'sleep', turns: item.effectValue || 3 });
        soundManager.playSelect();
        addLog(`💤 ¡${user.name} lanzó ${item.name} a ${foe.name}! ¡${foe.name} se ha dormido!`);
      } else {
        addLog(`🎒 ${user.name} usó ${item.name}... ¡pero no tuvo efecto!`);
      }
    } else if (item.effectType === 'cure_status') {
      const current = ailmentsRef.current[targetMember.id]?.status;
      if (current && current === item.cures) {
        setAilment(targetMember.id, null);
        soundManager.playHeal();
        const cured = { poison: 'del envenenamiento', paralysis: 'de la parálisis', sleep: 'del sueño', burn: 'de las quemaduras', freeze: 'del congelamiento' }[current];
        addLog(`🍓 ¡${user.name} usó ${item.name} en ${targetMember.name}! Se recuperó ${cured}.`);
      } else {
        addLog(`🎒 ${user.name} usó ${item.name} en ${targetMember.name}... ¡pero no tuvo efecto!`);
      }
    } else {
      addLog(`🎒 ${user.name} usó ${item.name}.`);
    }

    const updatedTeam = [...teamArr];
    updatedTeam[targetIdx] = targetMember;
    return updatedTeam;
  };

  // Handle using an item from the bag on a team member
  const handleUseItemOnTarget = (item: Item, targetIdx: number, moveIdx?: number, enemyId?: string) => {
    const targetForHealing = team[targetIdx];
    if (item.effectType === 'heal_hp' && (!targetForHealing || targetForHealing.stats.hp <= 0)) return;
    const user = currentMember;
    if (!user) return;

    soundManager.playSelect();

    if (coop) {
      // The item is used when the host closes the round
      const action: CoopCombatAction = { kind: 'item', memberId: user.id, itemId: item.id, targetIdx, moveIdx, enemyId };
      coop.submit('combat', roundKey(executedRoundsRef.current), action);
      setChosenMoves({});
      setItemUsers({ [user.id]: item.name });
      setEditingAction(false);
      setCombatMenu('MOVES_SELECT');
      setSelectedBagItem(null);
      setElixirTargetIdx(null);
      setPendingMoveChoice(null);
      return;
    }

    const updatedTeam = applyItemEffect(item, user, [...team], targetIdx, moveIdx, enemyId);
    if (!updatedTeam) return;
    setTeam(updatedTeam);

    setCombatMenu('MOVES_SELECT');
    setSelectedBagItem(null);
    setElixirTargetIdx(null);
    setPendingMoveChoice(null);

    // The item replaces this member's action for the round
    const { [user.id]: _discarded, ...remainingMoves } = chosenMoves;
    setChosenMoves(remainingMoves);
    setItemUsers((prev) => ({ ...prev, [user.id]: item.name }));

    const updatedAlive = updatedTeam.filter((m) => m.stats.hp > 0);
    const userPos = updatedAlive.findIndex((m) => m.id === user.id);
    if (userPos !== -1 && userPos < updatedAlive.length - 1) {
      setSelectingMemberIndex(userPos + 1);
    } else {
      executeSimultaneousRound(remainingMoves, memberTargetMap, updatedTeam);
    }
  };

  const resolveLearnChoice = (forget: string | null) => {
    const learn = victoryState?.pendingLearns[0];
    if (!learn) return;
    soundManager.playSelect();
    if (forget) {
      setTeam((prev) => prev.map((m) => (m.id === learn.memberId ? replaceMove(m, forget, learn.move) : m)));
    }
    setVictoryState((prev) => (prev ? { ...prev, pendingLearns: prev.pendingLearns.slice(1) } : prev));
  };

  // Co-op: replay every round committed by the host, in order and with the shared seed
  useEffect(() => {
    if (!coop || isProcessingTurn || victoryState) return;
    const r = executedRoundsRef.current;
    const actions = coop.rounds[r];
    if (!actions) return;
    executedRoundsRef.current = r + 1;
    setExecutedRounds(r + 1);
    setEditingAction(false);
    rngRef.current = seededRandom(`${coop.seed}:${coop.combatId}:${r}`);

    let teamArr = [...team];
    const moves: Record<string, Move> = {};
    const targets: Record<string, string> = {};
    for (const member of team) {
      const action = actions.find((a) => a.memberId === member.id);
      const current = teamArr.find((m) => m.id === member.id);
      if (!action || !current || current.stats.hp <= 0) continue;
      if (action.kind === 'item') {
        const item = currentInventoryRef.current.find((it) => it.id === action.itemId);
        if (!item) {
          addLog(`🎒 ${current.name} buscó un objeto en la mochila... ¡pero ya no quedaba!`);
          continue;
        }
        const next = applyItemEffect(item, current, teamArr, action.targetIdx, action.moveIdx, action.enemyId);
        if (!next) return;
        teamArr = next;
      } else {
        moves[member.id] =
          action.moveId === BASIC_ATTACK.id
            ? BASIC_ATTACK
            : current.moves.find((m) => m.id === action.moveId) ?? BASIC_ATTACK;
        targets[member.id] = action.targetId;
      }
    }
    setTeam(teamArr);
    executeSimultaneousRound(moves, targets, teamArr);
  }, [coop?.rounds.length, isProcessingTurn, victoryState]);

  // Co-op host: closes the round once every present player has chosen (absent players just attack)
  useEffect(() => {
    if (!coop?.isHost || isProcessingTurn || victoryState) return;
    const r = coop.rounds.length;
    if (executedRounds !== r || aliveEnemies.length === 0 || aliveMembers.length === 0) return;
    const actions: CoopCombatAction[] = [];
    for (const member of aliveMembers) {
      const owner = ownerOf(member.id);
      if (!coop.activeUids.includes(owner)) {
        actions.push({ kind: 'move', memberId: member.id, moveId: BASIC_ATTACK.id, targetId: aliveEnemies[0].id });
        continue;
      }
      const input = coop.actionInputs[owner];
      if (!input || input.key !== roundKey(r)) return;
      try {
        actions.push({ ...(JSON.parse(input.data) as CoopCombatAction), memberId: member.id });
      } catch {
        return;
      }
    }
    coop.commitRound(r, actions);
  }, [coop?.actionInputs, coop?.activeUids, coop?.rounds.length, executedRounds, isProcessingTurn, victoryState, team, enemies]);

  // Co-op victory: learn-move choices belong to each leader's owner, recruitment to one random member
  const coopDecisionKey = !coop || !victoryState
    ? null
    : victoryState.pendingLearns.length > 0
    ? `learn${learnsResolved}`
    : victoryState.recruitedPokemon
    ? 'recruit'
    : null;
  const coopDecisionOwner = !victoryState
    ? undefined
    : victoryState.pendingLearns.length > 0
    ? ownerOf(victoryState.pendingLearns[0].memberId)
    : victoryState.recruiterUid;
  const victoryReportedRef = useRef(false);

  const reportCoopVictory = (recruit: Pokemon | undefined) => {
    if (!victoryState || victoryReportedRef.current) return;
    victoryReportedRef.current = true;
    onVictory(
      team,
      victoryState.expGained,
      victoryState.goldGained,
      victoryState.droppedItem,
      recruit,
      false,
      recruit ? victoryState.recruiterUid : undefined
    );
  };

  useEffect(() => {
    if (!coop?.isHost || !coopDecisionKey || !coopDecisionOwner) return;
    if (coop.decisions[coopDecisionKey] !== undefined) return;
    if (!coop.activeUids.includes(coopDecisionOwner)) {
      coop.commitDecision(coopDecisionKey, null);
      return;
    }
    const input = coop.decisionInputs[coopDecisionOwner];
    if (input?.key !== `${coop.combatId}:${coopDecisionKey}`) return;
    try {
      const value = JSON.parse(input.data);
      coop.commitDecision(coopDecisionKey, typeof value === 'string' ? value : null);
    } catch {
      coop.commitDecision(coopDecisionKey, null);
    }
  }, [coop?.decisionInputs, coop?.decisions, coop?.activeUids, coopDecisionKey, coopDecisionOwner]);

  const appliedDecisionsRef = useRef(new Set<string>());
  useEffect(() => {
    if (!coop || !victoryState || !coopDecisionKey) return;
    const value = coop.decisions[coopDecisionKey];
    if (value === undefined || appliedDecisionsRef.current.has(coopDecisionKey)) return;
    appliedDecisionsRef.current.add(coopDecisionKey);
    if (coopDecisionKey.startsWith('learn')) {
      resolveLearnChoice(value);
      setLearnsResolved((n) => n + 1);
    } else if (coop.isHost) {
      reportCoopVictory(value === 'accept' ? victoryState.recruitedPokemon : undefined);
    }
  }, [coop?.decisions, coopDecisionKey]);

  const sendCoopDecision = (value: string | null) => {
    if (!coop || !coopDecisionKey) return;
    soundManager.playSelect();
    coop.submit('decision', `${coop.combatId}:${coopDecisionKey}`, value);
  };

  // Co-op: has this player already sent an action for the round being chosen?
  const myInput = coop?.actionInputs[coop.localUid];
  const coopActionSent = Boolean(coop && !editingAction && myInput?.key === roundKey(executedRounds));
  const coopWaitingFor = coop
    ? aliveMembers
        .map((m) => ownerOf(m.id))
        .filter((uid) => coop.activeUids.includes(uid) && coop.actionInputs[uid]?.key !== roundKey(executedRounds))
    : [];

  return (
    <div className="relative w-full h-full max-h-full flex flex-col justify-between rounded-xl sm:rounded-2xl border-2 border-slate-700/80 shadow-2xl bg-slate-950 overflow-hidden min-h-0 box-border">
      {/* Background with measured darkness scrim */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/65" />

      {/* TOP COMBAT BAR: Phase indicator & Enemy Squad Status */}
      <div className="relative z-10 px-2 sm:px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shadow-md shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 text-[10px] sm:text-xs font-bold text-amber-300">
          <Swords className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isProcessingTurn ? '¡Turno en curso!' : (
              <>
                <span className="sm:hidden">Elige</span>
                <span className="hidden sm:inline">Elige las acciones del equipo</span>
              </>
            )}
          </span>
        </div>

        {/* Enemy Team Summary: Single Boss/Enemy OR Squad Pills */}
        {enemies.length === 1 ? (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 border border-red-500/60 rounded-lg px-2 py-0.5 sm:py-1 shadow-sm shrink-0">
            <PmdPortrait pokedexId={enemies[0].pokedexId} size={24} showFrame={true} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white truncate max-w-[70px] sm:max-w-none">
                  {enemies[0].name}
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/70 px-1 rounded border border-amber-500/40">
                  Nv.{enemies[0].level}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-14 sm:w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      enemies[0].stats.hp / enemies[0].stats.maxHp < 0.25
                        ? 'bg-red-500'
                        : enemies[0].stats.hp / enemies[0].stats.maxHp < 0.5
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, (enemies[0].stats.hp / enemies[0].stats.maxHp) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono font-extrabold text-emerald-400 tabular-nums">
                  {enemies[0].stats.hp}/{enemies[0].stats.maxHp}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink min-w-0 overflow-x-auto py-0.5 scrollbar-none">
            {enemies.map((enemyMember) => {
              const isAlive = enemyMember.stats.hp > 0;
              const isTarget = isAlive && Boolean(pendingMoveChoice || combatMenu === 'BAG_ENEMY');
              return (
                <button
                  key={enemyMember.id}
                  type="button"
                  disabled={!isAlive || isProcessingTurn || !isTarget}
                  onClick={() => {
                    if (!isAlive || isProcessingTurn) return;
                    if (pendingMoveChoice) {
                      handleConfirmMemberAction(pendingMoveChoice.member, pendingMoveChoice.move, enemyMember.id);
                    } else if (combatMenu === 'BAG_ENEMY' && selectedBagItem) {
                      handleUseItemOnTarget(selectedBagItem, 0, undefined, enemyMember.id);
                    }
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-left transition-all shrink-0 ${
                    isTarget
                      ? 'border-red-500 bg-red-950/90 ring-1 ring-red-400 shadow-sm cursor-pointer'
                      : !isAlive
                      ? 'border-slate-800 bg-slate-900/40 opacity-40 grayscale cursor-not-allowed'
                      : 'border-slate-700 bg-slate-950/80'
                  }`}
                >
                  <PmdPortrait pokedexId={enemyMember.pokedexId} size={18} showFrame={false} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 leading-none">
                      <span className="font-bold text-[8px] sm:text-[9px] text-white truncate max-w-[42px] sm:max-w-[50px]">
                        {enemyMember.name}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono text-amber-400 font-bold">
                        Nv.{enemyMember.level}
                      </span>
                    </div>
                    <div className="w-8 sm:w-11 bg-slate-800 h-1 rounded-full overflow-hidden border border-slate-700 mt-0.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          enemyMember.stats.hp / enemyMember.stats.maxHp < 0.25
                            ? 'bg-red-500'
                            : enemyMember.stats.hp / enemyMember.stats.maxHp < 0.5
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(0, (enemyMember.stats.hp / enemyMember.stats.maxHp) * 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CENTER ARENA: PLAYER TEAM ON THE LEFT VS ENEMY ON THE RIGHT */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col-reverse sm:flex-row short:flex-row items-center justify-around px-2 sm:px-6 py-1 gap-1 sm:gap-2 overflow-hidden">
        {/* PLAYER TEAM FORMATION: All 1 to 4 members side-by-side */}
        <div className="flex items-end justify-center gap-1 sm:gap-3 flex-wrap short:flex-nowrap w-full sm:w-auto short:w-auto max-w-sm sm:max-w-md">
          {team.map((member, idx) => {
            const isAlive = member.stats.hp > 0;
            const isAttacking = attackingMemberId === member.id;
            const isHit = hitMemberId === member.id;
            const isCurrentSelecting =
              combatMenu === 'MOVES_SELECT' &&
              (coop ? currentMember?.id === member.id : aliveMembers[selectingMemberIndex]?.id === member.id);
            const hasChosen = Boolean(chosenMoves[member.id] || itemUsers[member.id]);

            return (
              <div
                key={member.id}
                onClick={() => {
                  if (isAlive && !isProcessingTurn && combatMenu === 'MOVES_SELECT' && !itemUsers[member.id]) {
                    const targetIdx = aliveMembers.findIndex((m) => m.id === member.id);
                    if (targetIdx !== -1) setSelectingMemberIndex(targetIdx);
                  }
                }}
                className={`flex flex-col items-center relative transition-all duration-200 cursor-pointer ${
                  isAttacking ? 'translate-x-4 scale-105' : ''
                } ${isHit ? 'animate-pulse brightness-200' : ''} ${
                  !isAlive ? 'opacity-30 grayscale' : 'opacity-100'
                }`}
              >
                {/* Floating Damage Indicator */}
                {floatingDamage?.targetId === member.id && (
                  <div
                    className={`absolute -top-7 font-pixel text-xs px-2 py-0.5 rounded shadow-lg animate-bounce z-20 ${
                      floatingDamage.type === 'heal'
                        ? 'bg-emerald-500 text-white'
                        : floatingDamage.type === 'status'
                        ? 'bg-sky-600 text-white'
                        : floatingDamage.type === 'miss'
                        ? 'bg-slate-700 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {floatingDamage.text}
                  </div>
                )}

                {/* HP Badge above sprite */}
                <div
                  className={`mb-0.5 rounded px-1 sm:px-1.5 py-0.5 text-center shadow backdrop-blur-sm w-[68px] min-[370px]:w-20 sm:w-auto sm:min-w-[80px] short:w-auto short:min-w-[65px] border transition-all ${
                    isCurrentSelecting
                      ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[8px] sm:text-[9px] font-mono font-bold text-white">
                    <span className="truncate min-w-0 max-w-[56px]">{member.name}</span>
                    <span className="text-amber-400 shrink-0">Nv.{member.level}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        member.stats.hp / member.stats.maxHp < 0.25
                          ? 'bg-red-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.max(0, (member.stats.hp / member.stats.maxHp) * 100)}%`,
                      }}
                    />
                    </div>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-400 tabular-nums">
                      {member.stats.hp}/{member.stats.maxHp}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 compact:hidden" title={`EXP ${member.exp}/${member.nextExp}`}>
                    <div className="flex-1 bg-slate-800 h-0.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all"
                        style={{ width: `${Math.min(100, (member.exp / member.nextExp) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[6px] sm:text-[7px] font-mono font-bold text-sky-400">EXP</span>
                  </div>
                  {renderStages(member.id)}
                </div>

                {/* Portrait from PMD Sprite Repository */}
                <div
                  className={`w-14 h-14 compact:w-11 compact:h-11 sm:w-16 sm:h-16 short:w-10 short:h-10 flex items-center justify-center relative transition-transform duration-200 ${
                    isAttacking ? 'translate-x-3 scale-105' : ''
                  } ${isHit ? 'animate-bounce brightness-150' : ''}`}
                >
                  <PmdPortrait
                    pokedexId={member.pokedexId}
                    emotion={
                      isHit
                        ? 'Pain'
                        : isAttacking
                        ? 'Angry'
                        : member.stats.hp / member.stats.maxHp < 0.3
                        ? 'Pain'
                        : 'Normal'
                    }
                    className="w-full h-full"
                    showFrame={true}
                  />

                  {/* Ready indicator */}
                  {hasChosen && isAlive && !isProcessingTurn && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}

                  {coop ? (
                    <span className="absolute -bottom-1 text-[7px] font-bold px-1 rounded bg-sky-500 text-sky-950 font-pixel z-10 max-w-[64px] truncate">
                      {playerName(ownerOf(member.id))}
                    </span>
                  ) : idx === 0 && (
                    <span className="absolute -bottom-1 text-[7px] font-bold px-1 rounded bg-amber-500 text-amber-950 font-pixel z-10">
                      LÍDER
                    </span>
                  )}
                </div>

                {/* Planned target indicator badge */}
                {hasChosen && memberTargetMap[member.id] && (
                  <span className="text-[7px] text-sky-300 font-mono font-bold truncate max-w-[56px] text-center bg-slate-900/90 px-1 rounded border border-sky-500/40 mt-0.5">
                    🎯 {memberTargetMap[member.id] === member.id
                      ? 'Sí mismo'
                      : enemies.find((e) => e.id === memberTargetMap[member.id])?.name || 'Rival'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* VS Divider */}
        <div className="hidden sm:flex flex-col items-center justify-center text-amber-400/70 shrink-0">
          <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-pixel mt-0.5">VS</span>
        </div>

        {/* ENEMY SQUAD FORMATION: 1 to 4 enemies side-by-side */}
        <div className="flex items-end justify-center gap-1 sm:gap-2.5 flex-wrap short:flex-nowrap w-full sm:w-auto short:w-auto sm:max-w-[48%] short:max-w-[48%]">
          {enemies.map((enemyMember) => {
            const isAlive = enemyMember.stats.hp > 0;
            const isAttacking = attackingEnemyId === enemyMember.id;
            const isHit = hitEnemyId === enemyMember.id;
            const isSelectingTarget = Boolean(pendingMoveChoice || (combatMenu === 'BAG_ENEMY' && selectedBagItem));

            return (
              <div
                key={enemyMember.id}
                onClick={() => {
                  if (!isAlive || isProcessingTurn) return;
                  if (pendingMoveChoice) {
                    handleConfirmMemberAction(
                      pendingMoveChoice.member,
                      pendingMoveChoice.move,
                      enemyMember.id
                    );
                  } else if (combatMenu === 'BAG_ENEMY' && selectedBagItem) {
                    handleUseItemOnTarget(selectedBagItem, 0, undefined, enemyMember.id);
                  }
                }}
                className={`flex flex-col items-center relative transition-all duration-200 ${
                  !isAlive ? 'opacity-40 grayscale pointer-events-none' : isSelectingTarget ? 'cursor-pointer hover:scale-105' : ''
                } ${isAttacking ? '-translate-x-3 sm:-translate-x-4 scale-105' : ''} ${
                  isHit ? 'animate-pulse brightness-150' : ''
                }`}
              >
                {/* Floating Damage Numbers */}
                {floatingDamage?.targetId === enemyMember.id && (
                  <div
                    className={`absolute -top-7 font-pixel text-xs sm:text-sm px-2 py-0.5 rounded shadow-lg animate-bounce z-20 ${
                      floatingDamage.type === 'miss'
                        ? 'bg-slate-700 text-white'
                        : floatingDamage.type === 'heal'
                        ? 'bg-emerald-500 text-white'
                        : floatingDamage.type === 'status'
                        ? 'bg-sky-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {floatingDamage.text}
                  </div>
                )}

                {/* Target Marker */}
                {isSelectingTarget && isAlive && (
                  <div
                    className="absolute -top-3.5 bg-red-500 ring-2 ring-red-300 animate-bounce text-white font-mono text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-red-300 shadow-sm z-20 flex items-center gap-0.5"
                  >
                    <span>🎯</span>
                    <span className="hidden sm:inline">{pendingMoveChoice ? 'Atacar' : 'Usar'}</span>
                  </div>
                )}

                {/* Mini HP & Level Pill */}
                <div className="flex flex-col items-center w-16 min-[400px]:w-[72px] sm:w-20 short:w-[68px] mb-0.5">
                  <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-mono text-slate-300">
                    <span className="font-bold text-red-300 truncate max-w-[48px] sm:max-w-[56px]">{enemyMember.name}</span>
                    <span className="text-amber-400 font-bold">Nv.{enemyMember.level}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 sm:h-1.5 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        enemyMember.stats.hp / enemyMember.stats.maxHp < 0.25
                          ? 'bg-red-500'
                          : enemyMember.stats.hp / enemyMember.stats.maxHp < 0.5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(0, (enemyMember.stats.hp / enemyMember.stats.maxHp) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-mono text-emerald-400 font-bold">
                    {isAlive ? `${enemyMember.stats.hp}/${enemyMember.stats.maxHp}` : 'K.O.'}
                  </span>
                  {isAlive && renderStages(enemyMember.id)}
                </div>

                {/* Enemy Field Portrait (PMD Repository) */}
                <div
                  className={`w-14 h-14 compact:w-11 compact:h-11 sm:w-16 sm:h-16 short:w-10 short:h-10 flex items-center justify-center rounded-xl p-0.5 border-2 transition-all ${
                    isSelectingTarget && isAlive
                      ? 'border-red-400 ring-2 ring-red-400/90 bg-red-950/60 shadow-lg'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <PmdPortrait
                    pokedexId={enemyMember.pokedexId}
                    emotion={
                      isHit
                        ? 'Pain'
                        : isAttacking
                        ? 'Angry'
                        : !isAlive
                        ? 'Pain'
                        : enemyMember.stats.hp / enemyMember.stats.maxHp < 0.3
                        ? 'Pain'
                        : 'Normal'
                    }
                    className="w-full h-full"
                    showFrame={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CONTROLS & MOVE SELECTION PANEL */}
      <div className="pmd-window relative z-20 bg-slate-900/98 border-t border-sky-500/70 p-2 sm:p-2.5 short:p-1.5 shadow-2xl flex flex-col gap-1.5 short:gap-1 shrink-0">
        {/* Battle log overlay while the round resolves (keeps the panel height stable) */}
        {isProcessingTurn && (
          <div className="absolute inset-0 z-30 bg-[#1c3478] rounded-[10px] p-2 sm:p-2.5 short:p-1.5 flex flex-col">
            <div className="flex-1 min-h-0 bg-slate-950 rounded-lg border border-slate-800 shadow-inner px-2.5 py-1.5 flex flex-col justify-start gap-0.5 overflow-hidden">
              {battleLogs.map((log, i) => {
                const isLatest = i === battleLogs.length - 1;
                return (
                  <p
                    key={`${i}_${log}`}
                    className={`text-[11px] sm:text-xs font-mono leading-snug ${
                      isLatest ? 'text-sky-200 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {log}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Battle Dialogue Ticker */}
        <div className="bg-slate-950 rounded-lg px-2.5 py-1 short:py-0.5 border border-slate-800 min-h-[26px] sm:min-h-[30px] short:min-h-0 flex items-center shadow-inner shrink-0">
          <p className="text-[11px] sm:text-xs text-sky-200 font-mono tracking-tight leading-normal truncate">
            {battleLogs[battleLogs.length - 1]}
          </p>
        </div>

        {/* Co-op: waiting for the rest of the party */}
        {coop && combatMenu === 'MOVES_SELECT' && !isProcessingTurn && !victoryState && (!currentMember || coopActionSent) && (
          <div className="bg-slate-950/80 rounded-lg p-2.5 border border-sky-700/60 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-200 text-center sm:text-left">
              {!currentMember ? 'Tu Pokémon está debilitado. ' : '¡Acción enviada! '}
              {coopWaitingFor.length > 0 ? (
                <>
                  Esperando a{' '}
                  <strong className="text-amber-300">{coopWaitingFor.map(playerName).join(', ')}</strong>...
                </>
              ) : (
                'Resolviendo el turno...'
              )}
            </p>
            {currentMember && (
              <button
                onClick={() => {
                  soundManager.playSelect();
                  setEditingAction(true);
                }}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer shrink-0"
              >
                Cambiar acción
              </button>
            )}
          </div>
        )}

        {/* 1. PER-MEMBER MOVE SELECTION (DEFAULT ACTIVE FLOW) */}
        {combatMenu === 'MOVES_SELECT' && currentMember && !coopActionSent && (
          <div className="flex flex-col gap-1.5 short:gap-1 w-full">
            {/* Header: Team Stepper & Active Member Details */}
            <div className="bg-slate-950/80 rounded-lg p-1.5 short:p-1 border border-slate-800 flex flex-col sm:flex-row short:flex-row sm:items-center short:items-center justify-between gap-1 sm:gap-1.5 shrink-0">
              {/* Stepper info */}
              <div className="flex items-center gap-2 min-w-0">
                <PmdPortrait pokedexId={currentMember.pokedexId} size={24} showFrame={true} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 font-pixel">
                      {coop ? 'Tu turno' : `Paso ${selectingMemberIndex + 1}/${aliveMembers.length}`}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="font-bold text-xs text-white truncate">
                      Turno de {currentMember.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-300 font-mono">
                    <span>
                      PS:{' '}
                      <strong className="text-emerald-400">
                        {currentMember.stats.hp}/{currentMember.stats.maxHp}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Nv. <strong className="text-amber-300">{currentMember.level}</strong>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline truncate text-violet-300">
                      {getAbilityName(abilityOf(currentMember))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Member Switcher Pills (own row on narrow screens) */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 sm:shrink-0 short:shrink-0 min-w-0">
                {aliveMembers.map((m, idx) => {
                  const isSelected = coop ? m.id === currentMember.id : idx === selectingMemberIndex;
                  const chosen = coop
                    ? coop.actionInputs[ownerOf(m.id)]?.key === roundKey(executedRounds)
                    : chosenMoves[m.id] || itemUsers[m.id];
                  return (
                    <button
                      key={m.id}
                      disabled={Boolean(coop) || Boolean(itemUsers[m.id])}
                      onClick={() => {
                        soundManager.playSelect();
                        setSelectingMemberIndex(idx);
                        setPendingMoveChoice(null);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border transition-all cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 ring-1 ring-amber-300'
                          : chosen
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {chosen ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                      <span>{m.name}</span>
                      {itemUsers[m.id] ? (
                        <span className="text-[8px] opacity-80 hidden sm:inline">
                          🎒 {itemUsers[m.id]}
                        </span>
                      ) : chosen && memberTargetMap[m.id] && (
                        <span className="text-[8px] opacity-80 hidden sm:inline">
                          ➔ {enemies.find((e) => e.id === memberTargetMap[m.id])?.name || ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. TARGET SELECTION FOR CHOSEN ACTION (When >1 enemy is present) */}
            {pendingMoveChoice ? (
              <div className="flex flex-col gap-1.5 w-full">
                {/* Target prompt banner with Back button */}
                <div className="flex items-center justify-between bg-slate-950/90 rounded-lg px-2.5 py-1.5 border border-red-500/50 shadow-md shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crosshair className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                    <span className="text-[11px] sm:text-xs text-white font-bold line-clamp-2 sm:truncate leading-tight">
                      ¿A qué rival ataca <strong className="text-amber-300">{pendingMoveChoice.member.name}</strong> con <strong className="text-sky-300">{pendingMoveChoice.move.name}</strong> ({isTypeless(pendingMoveChoice.move) ? 'Sin tipo' : pendingMoveChoice.move.type})?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSelect();
                      setPendingMoveChoice(null);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors shrink-0 cursor-pointer"
                  >
                    ← Cambiar ataque
                  </button>
                </div>

                {/* Target Options Grid (1 to 4 alive enemies) */}
                <div
                  className={`grid ${
                    aliveEnemies.length === 2
                      ? 'grid-cols-2'
                      : aliveEnemies.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  } gap-1.5 shrink-0`}
                >
                  {aliveEnemies.map((enemy) => {
                    const effectiveness = isTypeless(pendingMoveChoice.move)
                      ? 1
                      : getTypeEffectiveness(pendingMoveChoice.move.type, enemy.types);
                    return (
                      <button
                        key={enemy.id}
                        type="button"
                        onClick={() =>
                          handleConfirmMemberAction(
                            pendingMoveChoice.member,
                            pendingMoveChoice.move,
                            enemy.id
                          )
                        }
                        className="p-1.5 sm:p-2 rounded-lg border border-red-500/60 bg-slate-800/90 hover:bg-red-950/70 hover:border-red-400 transition-all text-center sm:text-left short:text-left flex flex-col sm:flex-row short:flex-row items-center sm:justify-between short:justify-between gap-1 sm:gap-1.5 cursor-pointer shadow-md group active:scale-98 min-w-0"
                      >
                        <div className="flex flex-col sm:flex-row short:flex-row items-center gap-1 sm:gap-2 min-w-0 max-w-full">
                          <PmdPortrait pokedexId={enemy.pokedexId} size={28} showFrame={true} />
                          <div className="min-w-0 max-w-full">
                            <div className="flex items-center justify-center sm:justify-start short:justify-start gap-1 min-w-0">
                              <span className="font-bold text-xs text-white truncate group-hover:text-red-300">
                                {enemy.name}
                              </span>
                              <span className="text-[9px] text-amber-400 font-bold shrink-0">Nv.{enemy.level}</span>
                            </div>
                            <div className="text-[9px] font-mono text-emerald-400">
                              PS: {enemy.stats.hp}/{enemy.stats.maxHp}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-center sm:text-right short:text-right">
                          {effectiveness > 1 ? (
                            <span className="text-[8px] sm:text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/50 block">
                              ¡Súper eficaz!
                            </span>
                          ) : effectiveness < 1 && effectiveness > 0 ? (
                            <span className="text-[8px] sm:text-[9px] text-slate-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-700 block">
                              Poco eficaz
                            </span>
                          ) : effectiveness === 0 ? (
                            <span className="text-[8px] sm:text-[9px] text-red-400 bg-red-950 px-1 py-0.5 rounded border border-red-700 block">
                              Sin efecto
                            </span>
                          ) : (
                            <span className="text-[8px] sm:text-[9px] text-sky-300 bg-sky-950/60 px-1 py-0.5 rounded border border-sky-700/50 block">
                              Eficaz
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* THE 4 MOVES IN A CLEAN 2x2 GRID (GUARANTEED VISIBLE & NEVER CUT OFF) */
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5 shrink-0">
                {currentMember.moves.map((move, moveIdx) => {
                  const col = TYPE_COLORS[move.type];
                  const isOutOfPp = move.pp <= 0;
                  const isSelectedForThisMember = chosenMoves[currentMember.id]?.id === move.id;

                  return (
                    <button
                      key={move.id}
                      disabled={isProcessingTurn || isOutOfPp}
                      onClick={() => handleSelectMemberMove(currentMember, move)}
                      style={{ gridColumn: moveIdx % 2 === 0 ? 1 : 3, gridRow: Math.floor(moveIdx / 2) + 1 }}
                      className={`p-1.5 sm:p-2 short:p-1 rounded-lg border text-left flex flex-col justify-between transition-all min-h-[44px] sm:min-h-[48px] short:min-h-0 cursor-pointer active:scale-98 ${
                        isSelectedForThisMember
                          ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
                          : isOutOfPp
                          ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                          : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 hover:border-amber-400 shadow-sm'
                      }`}
                    >
                      {/* Top Row: Type Badge + Move Name + PP */}
                      <div className="flex items-center justify-between w-full gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`sm:hidden w-2 h-2 rounded-full shrink-0 ${col.bg}`} title={move.type} />
                          <span
                            className={`hidden sm:inline text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${col.bg} ${col.text}`}
                          >
                            {move.type}
                          </span>
                          <span className="font-bold text-xs text-white truncate">
                            {move.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono tabular-nums font-semibold shrink-0 ${
                            isOutOfPp ? 'text-red-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <span className="hidden sm:inline">PP </span>{move.pp}/{move.maxPp}
                        </span>
                      </div>

                      {/* Bottom Row: Power / Category / Priority Tag */}
                      <div className="short:hidden flex items-center justify-between gap-1 text-[9px] text-slate-400 mt-0.5 min-w-0">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span>Pot: {move.power > 0 ? move.power : '—'}</span>
                          <span>·</span>
                          <span>
                            <span className="hidden sm:inline">Prec: </span>
                            {move.accuracy}%
                          </span>
                        </div>

                        {move.name === 'Ataque Rápido' ? (
                          <span className="text-[7px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 rounded font-bold">
                            Prioridad (+1)
                          </span>
                        ) : withEffects(move).target === 'all_enemies' ? (
                          <span className="text-[7px] bg-sky-400/20 text-sky-300 border border-sky-400/40 px-1 rounded font-bold">
                            Área
                          </span>
                        ) : (
                          <span className="hidden sm:inline text-[8px] capitalize text-slate-400">{move.category}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={isProcessingTurn}
                  onClick={() => handleSelectMemberMove(currentMember, BASIC_ATTACK)}
                  title={`${BASIC_ATTACK.name} · Sin tipo · Pot: ${BASIC_ATTACK.power} · PP ∞`}
                  style={{ gridColumn: 2, gridRow: '1 / span 2' }}
                  className={`self-center w-12 h-12 sm:w-14 sm:h-14 short:w-10 short:h-10 rounded-full border-2 flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    chosenMoves[currentMember.id]?.id === BASIC_ATTACK.id
                      ? 'bg-amber-500 border-amber-200 ring-2 ring-amber-400/60 text-amber-950'
                      : 'bg-slate-200 hover:bg-white border-slate-500 hover:border-amber-400 text-slate-900'
                  }`}
                >
                  <Swords className="w-4 h-4 short:w-3.5 short:h-3.5" />
                  <span className="text-[7px] sm:text-[8px] font-extrabold leading-none mt-0.5">∞</span>
                </button>
              </div>
            )}

            {/* Bottom Actions: Previous member / Mochila */}
            <div className="flex items-center justify-between gap-1.5 pt-1 short:pt-0.5 border-t border-slate-800 shrink-0">
              {selectingMemberIndex > 0 ? (
                <button
                  disabled={isProcessingTurn || Boolean(itemUsers[aliveMembers[selectingMemberIndex - 1]?.id])}
                  onClick={() => {
                    soundManager.playSelect();
                    setSelectingMemberIndex(selectingMemberIndex - 1);
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior ({aliveMembers[selectingMemberIndex - 1]?.name})</span>
                </button>
              ) : (
                <button
                  disabled={isProcessingTurn}
                  onClick={() => {
                    soundManager.playSelect();
                    setCombatMenu('MAIN_MENU');
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Opciones</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  disabled={isProcessingTurn}
                  onClick={() => {
                    soundManager.playSelect();
                    setCombatMenu('BAG');
                  }}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                >
                  <Backpack className="w-3.5 h-3.5" />
                  <span>Mochila ({inventory.reduce((a, b) => a + b.count, 0)})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. MAIN SUB-MENU (TACTICAL OPTIONS) */}
        {combatMenu === 'MAIN_MENU' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <button
              disabled={isProcessingTurn}
              onClick={() => {
                soundManager.playSelect();
                setCombatMenu('MOVES_SELECT');
              }}
              className="py-2 sm:py-2.5 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Swords className="w-4 h-4 text-amber-200" />
              <span>Elegir Movimientos</span>
            </button>

            <button
              disabled={isProcessingTurn}
              onClick={() => {
                soundManager.playSelect();
                setCombatMenu('BAG');
              }}
              className="py-2 sm:py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Backpack className="w-4 h-4 text-white" />
              <span>Mochila ({inventory.reduce((a, b) => a + b.count, 0)})</span>
            </button>
          </div>
        )}

        {/* 3. BAG ITEM SELECTION */}
        {combatMenu === 'BAG' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Backpack className="w-3.5 h-3.5 text-amber-400" />
                {currentMember ? `${currentMember.name} usa un objeto (gasta su turno):` : 'Selecciona un objeto para usar en combate:'}
              </span>
              <button
                onClick={() => setCombatMenu('MOVES_SELECT')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              >
                ← Volver al Combate
              </button>
            </div>

            {inventory.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 text-center bg-slate-950 rounded-xl">
                Tu mochila está vacía.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {inventory.map((item) => (
                  <button
                    key={item.id}
                    disabled={
                      isProcessingTurn ||
                      item.count <= 0 ||
                      item.effectType === 'unlock_ability' ||
                      item.effectType === 'evolution' ||
                      (!canUseEscapeOrb && item.category === 'orb')
                    }
                    title={!canUseEscapeOrb && item.category === 'orb' ? 'Las esferas no funcionan contra jefes' : undefined}
                    onClick={() => {
                      soundManager.playSelect();
                      if (item.effectType === 'inflict_status' && aliveEnemies.length > 1) {
                        setSelectedBagItem(item);
                        setCombatMenu('BAG_ENEMY');
                        return;
                      }
                      if (item.effectType === 'escape' || item.category === 'orb' || item.effectType === 'inflict_status') {
                        handleUseItemOnTarget(item, 0, undefined, aliveEnemies[0]?.id);
                        return;
                      }
                      setSelectedBagItem(item);
                      setCombatMenu('BAG_TARGET');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center justify-between text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{item.icon}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 tabular-nums ml-2">
                      x{item.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. TARGET SELECTION FOR BAG ITEM */}
        {combatMenu === 'BAG_TARGET' && selectedBagItem && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                ¿Sobre qué miembro de tu equipo deseas usar {selectedBagItem.name}?
              </span>
              <button
                onClick={() => setCombatMenu('BAG')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              >
                ← Volver a Mochila
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {team.map((member, idx) => (
                <button
                  key={member.id}
                  disabled={isProcessingTurn || (selectedBagItem.effectType === 'heal_hp' && member.stats.hp <= 0)}
                  onClick={() => {
                    if (selectedBagItem.effectType === 'restore_pp') {
                      soundManager.playSelect();
                      setElixirTargetIdx(idx);
                      setCombatMenu('BAG_MOVE');
                      return;
                    }
                    handleUseItemOnTarget(selectedBagItem, idx);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 hover:border-amber-400 rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PmdPortrait pokedexId={member.pokedexId} size={28} showFrame={true} />
                    <div>
                      <span className="font-bold text-xs text-white block truncate">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        PS: {member.stats.hp}/{member.stats.maxHp}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${selectedBagItem.effectType === 'heal_hp' && member.stats.hp <= 0 ? 'text-slate-500' : 'text-emerald-400'}`}>
                    {selectedBagItem.effectType === 'heal_hp' && member.stats.hp <= 0 ? 'Debilitado' : 'Usar'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* 4c. RIVAL SELECTION FOR OFFENSIVE ITEMS */}
        {combatMenu === 'BAG_ENEMY' && selectedBagItem && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                ¿A qué rival lanzas {selectedBagItem.name}?
              </span>
              <button
                onClick={() => {
                  setSelectedBagItem(null);
                  setCombatMenu('BAG');
                }}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              >
                ← Volver a Mochila
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {aliveEnemies.map((enemyMember) => (
                <button
                  key={enemyMember.id}
                  disabled={isProcessingTurn}
                  onClick={() => handleUseItemOnTarget(selectedBagItem, 0, undefined, enemyMember.id)}
                  className="p-1.5 sm:p-2 rounded-lg border border-red-500/60 bg-slate-800/90 hover:bg-red-950/70 hover:border-red-400 flex items-center gap-2 text-left cursor-pointer transition-colors"
                >
                  <PmdPortrait pokedexId={enemyMember.pokedexId} size={28} showFrame={true} />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">{enemyMember.name}</span>
                    <span className="text-[9px] font-mono text-emerald-400">
                      PS: {enemyMember.stats.hp}/{enemyMember.stats.maxHp}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4b. MOVE SELECTION FOR ELIXIR */}
        {combatMenu === 'BAG_MOVE' && selectedBagItem && elixirTargetIdx !== null && team[elixirTargetIdx] && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                ¿Qué movimiento de {team[elixirTargetIdx].name} quieres restaurar?
              </span>
              <button
                onClick={() => setCombatMenu('BAG_TARGET')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              >
                ← Volver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {team[elixirTargetIdx].moves.map((move, moveIdx) => (
                <button
                  key={move.id}
                  disabled={isProcessingTurn || move.pp >= move.maxPp}
                  onClick={() => handleUseItemOnTarget(selectedBagItem, elixirTargetIdx, moveIdx)}
                  className="p-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 hover:border-amber-400 rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <span className="font-bold text-xs text-white truncate">{move.name}</span>
                  <span className={`text-[10px] font-mono tabular-nums ${move.pp <= 0 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                    PP {move.pp}/{move.maxPp}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VICTORY & RECRUITMENT MODAL (PMD SPRITE REPOSITORY PORTRAITS) */}
      {victoryState && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="pmd-window pmd-gold bg-slate-900 border-2 border-amber-400 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-center flex flex-col gap-3.5 animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-300">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-400 font-pixel">
                ¡Victoria del Equipo!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Todos tus Pokémon coordinaron sus movimientos y superaron al rival.
              </p>
            </div>

            {/* EXP & Rewards */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Experiencia para todo el equipo:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{victoryState.expGained} EXP c/u
                </span>
              </div>
              {victoryState.goldGained > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>Pokécuartos obtenidos:</span>
                  <span className="font-mono font-bold text-amber-300">
                    +{victoryState.goldGained} 🪙
                  </span>
                </div>
              )}
              {victoryState.goldGained === 0 && !victoryState.droppedItem && (
                <div className="flex justify-between items-center text-slate-500 italic">
                  <span>Botín:</span>
                  <span>No encontraste nada</span>
                </div>
              )}
              {victoryState.droppedItem && (
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-700/60">
                  <span>Objeto encontrado:</span>
                  <span className="font-bold text-sky-300">
                    {victoryState.droppedItem.icon} {victoryState.droppedItem.name}
                  </span>
                </div>
              )}
            </div>

            {/* Level up alerts */}
            {victoryState.leveledUpPokemon && victoryState.leveledUpPokemon.length > 0 && (
              <div className="bg-amber-950/60 border border-amber-500/60 rounded-xl p-2.5 text-amber-200 text-xs flex flex-col gap-1 text-left">
                {victoryState.leveledUpPokemon.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      ¡<strong>{p.name}</strong> subió al Nivel {p.newLevel}! (+Estadísticas)
                      {p.learned.length > 0 && (
                        <span className="block text-emerald-300">Aprendió {p.learned.join(', ')}.</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* MOVE LEARNING PROMPT (one at a time, before recruitment / continue) */}
            {victoryState.pendingLearns.length > 0 ? (
              (() => {
                const learn = victoryState.pendingLearns[0];
                const learner = team.find((m) => m.id === learn.memberId);
                const resolveLearn = coop ? sendCoopDecision : resolveLearnChoice;
                if (coop && coopDecisionOwner !== coop.localUid) {
                  return (
                    <p className="bg-sky-950/70 border border-sky-500/60 rounded-xl p-3 text-sky-100 text-xs">
                      <strong>{playerName(coopDecisionOwner ?? '')}</strong> está decidiendo si {learn.memberName} aprende{' '}
                      <strong className="text-amber-300">{learn.move.name}</strong>...
                    </p>
                  );
                }
                return (
                  <div className="bg-sky-950/70 border-2 border-sky-400 rounded-xl p-3 text-sky-100 text-xs flex flex-col gap-2 text-left">
                    <p>
                      ¡<strong>{learn.memberName}</strong> quiere aprender{' '}
                      <strong className="text-amber-300">{learn.move.name}</strong> ({learn.move.type}
                      {learn.move.power > 0 ? `, Pot. ${learn.move.power}` : ''})! Pero ya conoce 4 movimientos.
                      ¿Cuál quieres olvidar?
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {learner?.moves.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => resolveLearn(m.name)}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-red-900/70 border border-slate-600 rounded-lg text-left cursor-pointer transition-colors"
                        >
                          <span className="font-bold block truncate">Olvidar {m.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {m.type}{m.power > 0 ? ` · Pot. ${m.power}` : ' · Estado'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => resolveLearn(null)}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      No aprender {learn.move.name}
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Podrás cambiar sus movimientos cuando quieras desde Equipo.
                    </p>
                  </div>
                );
              })()
            ) : coop && victoryState.recruitedPokemon ? (
              <div className="bg-emerald-950/70 border-2 border-emerald-400 rounded-xl p-3.5 text-emerald-100 text-xs flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-900 rounded-xl p-1 border border-emerald-500/50 flex items-center justify-center shrink-0">
                    <PmdPortrait pokedexId={victoryState.recruitedPokemon.pokedexId} emotion="Happy" size={44} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-pixel">
                      ¡Oportunidad de Reclutamiento!
                    </span>
                    <p className="font-extrabold text-sm text-white">
                      ¡{victoryState.recruitedPokemon.name} quiere unirse al campamento de{' '}
                      {victoryState.recruiterUid === coop.localUid ? 'ti' : playerName(victoryState.recruiterUid ?? '')}!
                    </p>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5">
                      Nv. {victoryState.recruitedPokemon.level} · PS: {victoryState.recruitedPokemon.stats.maxHp}
                    </p>
                  </div>
                </div>
                {victoryState.recruiterUid === coop.localUid ? (
                  <div className="flex flex-col gap-2 pt-1 border-t border-emerald-800/80">
                    <button
                      onClick={() => sendCoopDecision('accept')}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Enviar a mi Campamento de Reserva</span>
                    </button>
                    <button
                      onClick={() => sendCoopDecision(null)}
                      className="w-full py-2 px-3 bg-transparent hover:bg-red-950/60 text-red-300 font-semibold rounded-lg text-xs border border-red-800/70 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>Rechazar (no se une)</span>
                    </button>
                  </div>
                ) : (
                  <p className="pt-2 border-t border-emerald-800/80 text-emerald-200">
                    Esperando a que {playerName(victoryState.recruiterUid ?? '')} decida...
                  </p>
                )}
              </div>
            ) : coop ? (
              coop.isHost ? (
                <button
                  onClick={() => {
                    soundManager.playSelect();
                    reportCoopVictory(undefined);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  Continuar Exploración
                </button>
              ) : (
                <p className="text-xs text-slate-300">Esperando a que el líder del grupo continúe la exploración...</p>
              )
            ) : victoryState.recruitedPokemon ? (
              <div className="bg-emerald-950/70 border-2 border-emerald-400 rounded-xl p-3.5 text-emerald-100 text-xs flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-slate-900 rounded-xl p-1 border border-emerald-500/50 flex items-center justify-center shrink-0">
                    <PmdPortrait
                      pokedexId={victoryState.recruitedPokemon.pokedexId}
                      emotion="Happy"
                      size={44}
                    />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block font-pixel">
                      ¡Oportunidad de Reclutamiento!
                    </span>
                    <p className="font-extrabold text-sm text-white">
                      ¡{victoryState.recruitedPokemon.name} quiere unirse a tu equipo!
                    </p>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5">
                      Nv. {victoryState.recruitedPokemon.level} · PS: {victoryState.recruitedPokemon.stats.maxHp} · Vel: {victoryState.recruitedPokemon.stats.speed}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1 border-t border-emerald-800/80">
                  {team.length < 4 ? (
                    <button
                      onClick={() => {
                        soundManager.playLevelUp();
                        onVictory(
                          team,
                          victoryState.expGained,
                          victoryState.goldGained,
                          victoryState.droppedItem,
                          victoryState.recruitedPokemon,
                          true // Add to active team
                        );
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>¡Añadir al Equipo Activo Ahora! ({team.length + 1}/4)</span>
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      soundManager.playDrop();
                      onVictory(
                        team,
                        victoryState.expGained,
                        victoryState.goldGained,
                        victoryState.droppedItem,
                        victoryState.recruitedPokemon,
                        false // Send to reserves
                      );
                    }}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-lg text-xs border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Enviar al Campamento de Reserva</span>
                  </button>

                  <button
                    onClick={() => {
                      soundManager.playSelect();
                      onVictory(
                        team,
                        victoryState.expGained,
                        victoryState.goldGained,
                        victoryState.droppedItem,
                        undefined,
                        false
                      );
                    }}
                    className="w-full py-2 px-3 bg-transparent hover:bg-red-950/60 text-red-300 font-semibold rounded-lg text-xs border border-red-800/70 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Rechazar (no se une)</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  soundManager.playSelect();
                  onVictory(
                    team,
                    victoryState.expGained,
                    victoryState.goldGained,
                    victoryState.droppedItem,
                    undefined,
                    false
                  );
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Continuar Exploración
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
