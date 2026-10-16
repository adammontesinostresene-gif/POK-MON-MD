import React, { useState, useEffect } from 'react';
import { Pokemon, Move, Item, PokemonType } from '../types/game';
import { TYPE_COLORS, getTypeEffectiveness, getExpToNextLevel } from '../data/pokemonData';
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

// Global damage tuning for all attacks (player and enemies)
const DAMAGE_MULTIPLIER = 1.35;

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
    addToActiveTeam?: boolean
  ) => void;
  onDefeat: () => void;
  onFlee: () => void;
  onEscapeDungeon: (team: Pokemon[], inventory: Item[]) => void;
  canFlee?: boolean;
  onUpdateInventory: (items: Item[]) => void;
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
  onFlee,
  onEscapeDungeon,
  canFlee = true,
  onUpdateInventory,
}) => {
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

  // Target selection: ID of the enemy that player is currently targeting
  const [selectedTargetEnemyId, setSelectedTargetEnemyId] = useState<string>(() => {
    return initialEnemies[0]?.id || '';
  });
  // Per-member target mapping (defaulting to selectedTargetEnemyId)
  const [memberTargetMap, setMemberTargetMap] = useState<Record<string, string>>({});

  // Combat sub-menus:
  // 'MOVES_SELECT': sequential per-member move selection (Team Order: Member 0, Member 1, ...)
  // 'MAIN_MENU': overall options (Attack, Bag, Flee)
  // 'BAG': inventory selection
  // 'BAG_TARGET': target for item
  const [combatMenu, setCombatMenu] = useState<'MOVES_SELECT' | 'MAIN_MENU' | 'BAG' | 'BAG_TARGET'>('MOVES_SELECT');

  // Multi-member move selection state:
  // Tracks which member in aliveMembers is currently picking their move (index 0, 1, 2, ...)
  const [selectingMemberIndex, setSelectingMemberIndex] = useState<number>(0);
  // Stores chosen moves for each alive member: key is member.id, value is chosen Move
  const [chosenMoves, setChosenMoves] = useState<Record<string, Move>>({});
  // If a member picks a move that targets an enemy and >1 enemy is alive, stores pending move for target selection
  const [pendingMoveChoice, setPendingMoveChoice] = useState<{ member: Pokemon; move: Move } | null>(null);

  // Item usage state
  const [selectedBagItem, setSelectedBagItem] = useState<Item | null>(null);
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
    leveledUpPokemon?: { name: string; oldLevel: number; newLevel: number }[];
  } | null>(null);

  // Play battle music on mount
  useEffect(() => {
    soundManager.startBgm('combat');
    return () => {
      soundManager.stopBgm();
    };
  }, []);

  // Safe reference to the current selecting member
  const currentMember = aliveMembers[selectingMemberIndex] || aliveMembers[0];

  const addLog = (msg: string) => {
    setBattleLogs((prev) => [...prev.slice(-7), msg]);
    soundManager.playTextBlip();
  };

  // Helper for damage calculation
  const calculateDamage = (attacker: Pokemon, defender: Pokemon, move: Move) => {
    if (move.category === 'status') {
      return { damage: 0, effectiveness: 1, isCrit: false };
    }

    const isPhysical = move.category === 'physical';
    const atkStat = isPhysical ? attacker.stats.attack : attacker.stats.spAttack;
    const defStat = isPhysical ? defender.stats.defense : defender.stats.spDefense;

    const effectiveness = getTypeEffectiveness(move.type, defender.types);
    const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
    const variance = 0.85 + Math.random() * 0.15;
    const isCrit = Math.random() < 0.08;
    const critMult = isCrit ? 1.5 : 1.0;

    const baseDmg =
      ((2 * attacker.level / 5 + 2) * move.power * (atkStat / Math.max(1, defStat)) / 50 + 2) *
      stab *
      effectiveness *
      critMult *
      variance *
      DAMAGE_MULTIPLIER;

    return {
      damage: Math.max(1, Math.round(baseDmg)),
      effectiveness,
      isCrit,
    };
  };

  // Handle a team member choosing their move in team order
  const handleSelectMemberMove = (member: Pokemon, move: Move) => {
    soundManager.playSelect();

    // If move is a self-buff or self-heal, immediately target self
    if (move.healPercent) {
      handleConfirmMemberAction(member, move, member.id);
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
        const assignedTarget = confirmedTargets[member.id] || selectedTargetEnemyId || aliveEnemies[0]?.id;
        actionQueue.push({
          actorId: member.id,
          actorName: member.name,
          isPlayerTeam: true,
          memberIndex: i,
          speed: member.stats.speed,
          priority: move.name === 'Ataque Rápido' ? 1 : 0,
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
          enemyActor.moves[Math.floor(Math.random() * enemyActor.moves.length)] || {
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
          speed: enemyActor.stats.speed,
          priority: randomEnemyMove.name === 'Ataque Rápido' ? 1 : 0,
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

        // Self-heal move
        if (action.move.healPercent) {
          addLog(`✨ ${member.name} usa ${action.move.name}!`);
          soundManager.playHeal();
          setAttackingMemberId(member.id);
          await new Promise((r) => setTimeout(r, 220));
          setAttackingMemberId(null);

          const healAmount = Math.round((member.stats.maxHp * action.move.healPercent) / 100);
          member.stats.hp = Math.min(member.stats.maxHp, member.stats.hp + healAmount);
          currentTeam[action.memberIndex!] = { ...member };
          setTeam([...currentTeam]);
          setFloatingDamage({ targetId: member.id, text: `+${healAmount} PS`, type: 'heal' });
          await new Promise((r) => setTimeout(r, 550));
          setFloatingDamage(null);
          continue;
        }

        // Offensive move: find target enemy. If original target fainted, retarget next alive enemy!
        let targetEnemy = currentEnemies.find((e) => e.id === action.targetId && e.stats.hp > 0);
        if (!targetEnemy) {
          targetEnemy = currentEnemies.find((e) => e.stats.hp > 0);
        }
        if (!targetEnemy) break; // All enemies down

        const targetEnemyIdx = currentEnemies.findIndex((e) => e.id === targetEnemy.id);

        addLog(`⚡ ${member.name} usa ${action.move.name} contra ${targetEnemy.name}!`);

        if (action.move.type === 'Eléctrico') {
          soundManager.playElectricShock();
        } else {
          soundManager.playTackle();
        }

        setAttackingMemberId(member.id);
        await new Promise((r) => setTimeout(r, 220));
        setAttackingMemberId(null);

        // Calculate and apply damage to target enemy
        if (action.move.power > 0) {
          const { damage, effectiveness, isCrit } = calculateDamage(member, targetEnemy, action.move);
          setHitEnemyId(targetEnemy.id);
          soundManager.playHit();
          setFloatingDamage({ targetId: targetEnemy.id, text: `-${damage}`, type: 'damage' });

          targetEnemy.stats.hp = Math.max(0, targetEnemy.stats.hp - damage);
          currentEnemies[targetEnemyIdx] = { ...targetEnemy };
          setEnemies([...currentEnemies]);

          await new Promise((r) => setTimeout(r, 250));
          setHitEnemyId(null);

          if (isCrit) addLog(`¡Golpe crítico de ${member.name}!`);
          if (effectiveness > 1.0) addLog(`¡Ataque súper eficaz contra ${targetEnemy.name}!`);
          if (effectiveness < 1.0 && effectiveness > 0) addLog(`No es muy eficaz...`);

          if (targetEnemy.stats.hp <= 0) {
            addLog(`¡${targetEnemy.name} cayó debilitado!`);
            soundManager.playHit();
          }

          await new Promise((r) => setTimeout(r, 450));
          setFloatingDamage(null);

          // Check if all enemies defeated
          if (currentEnemies.every((e) => e.stats.hp <= 0)) {
            await handleVictory(currentTeam, currentEnemies);
            setIsProcessingTurn(false);
            setCurrentActingActorId(null);
            setCurrentExecutionQueue([]);
            return;
          }
        }
      } else {
        // ENEMY'S ACTION
        const enemyActor = currentEnemies[action.memberIndex!];
        if (!enemyActor || enemyActor.stats.hp <= 0) {
          // This enemy fainted before acting
          continue;
        }

        const currentAlive = currentTeam.filter((m) => m.stats.hp > 0);
        if (currentAlive.length === 0) break;

        const targetMember = currentAlive[Math.floor(Math.random() * currentAlive.length)];
        const targetIdx = currentTeam.findIndex((m) => m.id === targetMember.id);

        addLog(`💥 ¡${enemyActor.name} ataca a ${targetMember.name} con ${action.move.name}!`);

        setAttackingEnemyId(enemyActor.id);
        await new Promise((r) => setTimeout(r, 220));
        setAttackingEnemyId(null);

        const { damage, effectiveness, isCrit } = calculateDamage(enemyActor, targetMember, action.move);

        setHitMemberId(targetMember.id);
        soundManager.playHit();
        setFloatingDamage({ targetId: targetMember.id, text: `-${damage}`, type: 'damage' });

        targetMember.stats.hp = Math.max(0, targetMember.stats.hp - damage);
        currentTeam[targetIdx] = { ...targetMember };
        setTeam([...currentTeam]);

        await new Promise((r) => setTimeout(r, 250));
        setHitMemberId(null);

        if (isCrit) addLog(`¡Golpe crítico de ${enemyActor.name}!`);

        await new Promise((r) => setTimeout(r, 450));
        setFloatingDamage(null);

        // Check if target member fainted
        if (targetMember.stats.hp <= 0) {
          addLog(`¡${targetMember.name} cayó debilitado!`);
          soundManager.playDefeat();
          await new Promise((r) => setTimeout(r, 400));
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

    // Reset chosen moves and restart selection for next round
    setCurrentActingActorId(null);
    setCurrentExecutionQueue([]);
    setChosenMoves({});
    setItemUsers({});
    setMemberTargetMap({});
    setPendingMoveChoice(null);
    setSelectingMemberIndex(0);
    // If selected target is dead, pick first alive enemy
    setSelectedTargetEnemyId((prev) => {
      if (currentEnemies.some((e) => e.id === prev && e.stats.hp > 0)) return prev;
      const nextAlive = currentEnemies.find((e) => e.stats.hp > 0);
      return nextAlive ? nextAlive.id : '';
    });
    setCombatMenu('MOVES_SELECT');
    setIsProcessingTurn(false);
  };

  // Handle victory and recruitment chance
  const handleVictory = async (finalTeam: Pokemon[], defeatedEnemies: Pokemon[]) => {
    soundManager.stopBgm();
    soundManager.playVictory();

    // Reward scales with the number and levels of all defeated enemies!
    const expReward = defeatedEnemies.reduce(
      (sum, e) => sum + Math.round(e.level * 10 + Math.random() * 5),
      0
    );
    // Loot roll: 50% nothing, otherwise either gold or an item (never both)
    const lootRoll = Math.random();
    const goldReward =
      lootRoll < 0.25
        ? defeatedEnemies.reduce((sum, e) => sum + Math.round(e.level * 18 + Math.random() * 20), 0)
        : 0;

    // Level-up checks for surviving team members: strictly ONE notification message per Pokémon
    const leveledMap = new Map<string, { name: string; oldLevel: number; newLevel: number }>();
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

        // Boost stats upon leveling
        stats.maxHp += 4;
        stats.hp = Math.min(stats.maxHp, stats.hp + 4);
        stats.attack += 2;
        stats.defense += 2;
        stats.spAttack += 2;
        stats.spDefense += 2;
        stats.speed += 1;
      }

      // Add strictly ONE level-up alert for this Pokémon if its level increased
      if (level > initialLevel && !leveledMap.has(member.id)) {
        leveledMap.set(member.id, { name: member.name, oldLevel: initialLevel, newLevel: level });
      }

      return {
        ...member,
        exp,
        level,
        nextExp,
        stats,
      };
    });

    const leveledList = Array.from(leveledMap.values());

    setTeam(updatedTeam);

    // Pick one defeated enemy; it joins based on its own species recruit rate
    let potentialRecruit: Pokemon | undefined = undefined;
    const recruitCandidate =
      defeatedEnemies.length > 0
        ? defeatedEnemies[Math.floor(Math.random() * defeatedEnemies.length)]
        : undefined;
    if (recruitCandidate && Math.random() < (recruitCandidate.recruitRate ?? 0.65)) {
      potentialRecruit = {
        ...recruitCandidate,
        id: `${recruitCandidate.name.toLowerCase()}_recruit_${Date.now()}`,
        status: 'none',
        stats: {
          ...recruitCandidate.stats,
          hp: recruitCandidate.stats.maxHp, // Recruited at full health!
        },
      };
    }

    let droppedItem: Item | undefined = undefined;
    if (lootRoll >= 0.25 && lootRoll < 0.5) {
      droppedItem = {
        id: `drop_oran_${Date.now()}`,
        name: 'Baya Aranja',
        description: 'Restaura 40 PS a un compañero.',
        category: 'healing',
        effectType: 'heal_hp',
        effectValue: 40,
        count: 1,
        icon: '🫐',
      };
    }

    setVictoryState({
      isOpen: true,
      expGained: expReward,
      goldGained: goldReward,
      droppedItem,
      recruitedPokemon: potentialRecruit,
      leveledUpPokemon: leveledList,
    });
  };

  // Handle using an item from the bag on a team member
  const handleUseItemOnTarget = (item: Item, targetIdx: number) => {
    soundManager.playSelect();
    const user = currentMember;
    const updatedInv = inventory
      .map((it) => (it.id === item.id ? { ...it, count: it.count - 1 } : it))
      .filter((it) => it.count > 0);
    onUpdateInventory(updatedInv);

    const targetMember = { ...team[targetIdx], stats: { ...team[targetIdx].stats } };

    if (!canFlee && item.category === 'orb') {
      soundManager.playHit();
      addLog(`🚫 ${user.name} usó ${item.name}... ¡pero no tuvo efecto contra el jefe!`);
    } else if (item.effectType === 'heal_hp') {
      const healAmount = item.effectValue || 40;
      targetMember.stats.hp = Math.min(targetMember.stats.maxHp, targetMember.stats.hp + healAmount);
      soundManager.playHeal();
      addLog(`✨ ¡${user.name} usó ${item.name} en ${targetMember.name}! Recuperó ${healAmount} PS.`);
    } else if (item.effectType === 'revive') {
      targetMember.stats.hp = Math.round(targetMember.stats.maxHp * 0.6);
      soundManager.playLevelUp();
      addLog(`⭐ ¡${user.name} revivió a ${targetMember.name} con ${item.name}!`);
    } else if (item.effectType === 'escape') {
      soundManager.playSelect();
      addLog(`🌀 ¡${user.name} usó el Orbe Escape! El equipo sale de la mazmorra con todo su botín.`);
      setIsProcessingTurn(true);
      setCombatMenu('MOVES_SELECT');
      setSelectedBagItem(null);
      setTimeout(() => onEscapeDungeon(team, updatedInv), 900);
      return;
    } else {
      addLog(`🎒 ${user.name} usó ${item.name}.`);
    }

    const updatedTeam = [...team];
    updatedTeam[targetIdx] = targetMember;
    setTeam(updatedTeam);

    setCombatMenu('MOVES_SELECT');
    setSelectedBagItem(null);
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
            {isProcessingTurn ? '¡Turno en curso!' : 'Elige las acciones del equipo'}
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
              const isTarget = isAlive && (selectedTargetEnemyId === enemyMember.id || aliveEnemies.length === 1);
              return (
                <button
                  key={enemyMember.id}
                  type="button"
                  disabled={!isAlive || isProcessingTurn}
                  onClick={() => {
                    if (isAlive && !isProcessingTurn) {
                      setSelectedTargetEnemyId(enemyMember.id);
                      soundManager.playSelect();
                    }
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-left transition-all shrink-0 cursor-pointer ${
                    isTarget
                      ? 'border-red-500 bg-red-950/90 ring-1 ring-red-400 shadow-sm'
                      : !isAlive
                      ? 'border-slate-800 bg-slate-900/40 opacity-40 grayscale cursor-not-allowed'
                      : 'border-slate-700 bg-slate-950/80 hover:border-slate-500'
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
      <div className="relative z-10 flex-1 min-h-0 flex flex-row items-center justify-around px-2 sm:px-6 py-1 gap-2 overflow-hidden">
        {/* PLAYER TEAM FORMATION: All 1 to 4 members side-by-side */}
        <div className="flex items-end justify-center gap-1.5 sm:gap-3 flex-wrap max-w-sm sm:max-w-md">
          {team.map((member, idx) => {
            const isAlive = member.stats.hp > 0;
            const isAttacking = attackingMemberId === member.id;
            const isHit = hitMemberId === member.id;
            const isCurrentSelecting =
              combatMenu === 'MOVES_SELECT' &&
              aliveMembers[selectingMemberIndex]?.id === member.id;
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
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {floatingDamage.text}
                  </div>
                )}

                {/* HP Badge above sprite */}
                <div
                  className={`mb-0.5 rounded px-1.5 py-0.5 text-center shadow backdrop-blur-sm min-w-[65px] sm:min-w-[80px] border transition-all ${
                    isCurrentSelecting
                      ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[8px] sm:text-[9px] font-mono font-bold text-white">
                    <span className="truncate max-w-[42px]">{member.name}</span>
                    <span className="text-amber-400">Nv.{member.level}</span>
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
                </div>

                {/* Portrait from PMD Sprite Repository */}
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 short:w-10 short:h-10 flex items-center justify-center relative transition-transform duration-200 ${
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

                  {idx === 0 && (
                    <span className="absolute -bottom-1 text-[7px] font-bold px-1 rounded bg-amber-500 text-amber-950 font-pixel z-10">
                      LÍDER
                    </span>
                  )}
                </div>

                {/* Planned target indicator badge */}
                {hasChosen && memberTargetMap[member.id] && (
                  <span className="text-[7px] text-sky-300 font-mono font-bold truncate max-w-[56px] text-center bg-slate-900/90 px-1 rounded border border-sky-500/40 mt-0.5">
                    🎯 {enemies.find((e) => e.id === memberTargetMap[member.id])?.name || 'Rival'}
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
        <div className="flex items-end justify-center gap-1 sm:gap-2.5 flex-wrap max-w-[48%]">
          {enemies.map((enemyMember) => {
            const isAlive = enemyMember.stats.hp > 0;
            const isAttacking = attackingEnemyId === enemyMember.id;
            const isHit = hitEnemyId === enemyMember.id;
            const isTargeted = isAlive && (selectedTargetEnemyId === enemyMember.id || aliveEnemies.length === 1);

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
                  } else {
                    setSelectedTargetEnemyId(enemyMember.id);
                    soundManager.playSelect();
                  }
                }}
                className={`flex flex-col items-center relative transition-all duration-200 cursor-pointer ${
                  !isAlive ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-105'
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
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {floatingDamage.text}
                  </div>
                )}

                {/* Target Marker */}
                {((isTargeted && aliveEnemies.length > 1) || (pendingMoveChoice && isAlive)) && (
                  <div
                    className={`absolute -top-3.5 ${
                      pendingMoveChoice
                        ? 'bg-red-500 ring-2 ring-red-300 animate-bounce'
                        : 'bg-red-600 animate-pulse'
                    } text-white font-mono text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-red-300 shadow-sm z-20 flex items-center gap-0.5`}
                  >
                    <span>🎯</span>
                    <span className="hidden sm:inline">{pendingMoveChoice ? 'Atacar' : 'Objetivo'}</span>
                  </div>
                )}

                {/* Mini HP & Level Pill */}
                <div className="flex flex-col items-center w-13 sm:w-16 mb-0.5">
                  <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-mono text-slate-300">
                    <span className="font-bold text-red-300 truncate max-w-[42px] sm:max-w-[48px]">{enemyMember.name}</span>
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
                </div>

                {/* Enemy Field Portrait (PMD Repository) */}
                <div
                  className={`w-13 h-13 sm:w-16 sm:h-16 short:w-10 short:h-10 flex items-center justify-center rounded-xl p-0.5 border-2 transition-all ${
                    pendingMoveChoice && isAlive
                      ? 'border-red-400 ring-2 ring-red-400/90 bg-red-950/60 shadow-lg'
                      : isTargeted
                      ? 'border-red-500 ring-2 ring-red-500/60 bg-red-950/40'
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
            <div className="flex-1 min-h-0 bg-slate-950 rounded-lg border border-slate-800 shadow-inner px-2.5 py-1.5 flex flex-col justify-end gap-0.5 overflow-hidden">
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

        {/* 1. PER-MEMBER MOVE SELECTION (DEFAULT ACTIVE FLOW) */}
        {combatMenu === 'MOVES_SELECT' && currentMember && (
          <div className="flex flex-col gap-1.5 short:gap-1 w-full">
            {/* Header: Team Stepper & Active Member Details */}
            <div className="bg-slate-950/80 rounded-lg p-1.5 short:p-1 border border-slate-800 flex items-center justify-between gap-1.5 shrink-0">
              {/* Stepper info */}
              <div className="flex items-center gap-2 min-w-0">
                <PmdPortrait pokedexId={currentMember.pokedexId} size={24} showFrame={true} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 font-pixel">
                      Paso {selectingMemberIndex + 1}/{aliveMembers.length}
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
                  </div>
                </div>
              </div>

              {/* Quick Member Switcher Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 shrink-0">
                {aliveMembers.map((m, idx) => {
                  const isSelected = idx === selectingMemberIndex;
                  const chosen = chosenMoves[m.id] || itemUsers[m.id];
                  return (
                    <button
                      key={m.id}
                      disabled={Boolean(itemUsers[m.id])}
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
                    <span className="text-[11px] sm:text-xs text-white font-bold truncate">
                      ¿A qué rival ataca <strong className="text-amber-300">{pendingMoveChoice.member.name}</strong> con <strong className="text-sky-300">{pendingMoveChoice.move.name}</strong> ({pendingMoveChoice.move.type})?
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
                    const effectiveness = getTypeEffectiveness(pendingMoveChoice.move.type, enemy.types);
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
                        className="p-1.5 sm:p-2 rounded-lg border border-red-500/60 bg-slate-800/90 hover:bg-red-950/70 hover:border-red-400 transition-all text-left flex items-center justify-between gap-1.5 cursor-pointer shadow-md group active:scale-98"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <PmdPortrait pokedexId={enemy.pokedexId} size={28} showFrame={true} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
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

                        <div className="shrink-0 text-right">
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
              <div className="grid grid-cols-2 gap-1.5 shrink-0">
                {currentMember.moves.map((move) => {
                  const col = TYPE_COLORS[move.type];
                  const isOutOfPp = move.pp <= 0;
                  const isSelectedForThisMember = chosenMoves[currentMember.id]?.id === move.id;

                  return (
                    <button
                      key={move.id}
                      disabled={isProcessingTurn || isOutOfPp}
                      onClick={() => handleSelectMemberMove(currentMember, move)}
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
                          <span
                            className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${col.bg} ${col.text}`}
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
                          PP {move.pp}/{move.maxPp}
                        </span>
                      </div>

                      {/* Bottom Row: Power / Category / Priority Tag */}
                      <div className="short:hidden flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                        <div className="flex items-center gap-1">
                          <span>Pot: {move.power > 0 ? move.power : '—'}</span>
                          <span>·</span>
                          <span>Prec: {move.accuracy}%</span>
                        </div>

                        {move.name === 'Ataque Rápido' ? (
                          <span className="text-[7px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 rounded font-bold">
                            Prioridad (+1)
                          </span>
                        ) : (
                          <span className="text-[8px] capitalize text-slate-400">{move.category}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions: Previous member / Mochila / Huir */}
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

                {canFlee && (
                  <button
                    disabled={isProcessingTurn}
                    onClick={() => {
                      soundManager.playSelect();
                      onFlee();
                    }}
                    className="py-1.5 px-3 bg-slate-750 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <span>Huir</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. MAIN SUB-MENU (TACTICAL OPTIONS) */}
        {combatMenu === 'MAIN_MENU' && (
          <div className={`grid grid-cols-1 ${canFlee ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-1.5`}>
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

            {canFlee && (
              <button
                disabled={isProcessingTurn}
                onClick={() => {
                  soundManager.playSelect();
                  onFlee();
                }}
                className="py-2 sm:py-2.5 px-3 bg-slate-750 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold rounded-xl text-xs sm:text-sm shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
                <span>Huir del Combate</span>
              </button>
            )}
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
                    disabled={isProcessingTurn || item.count <= 0}
                    onClick={() => {
                      soundManager.playSelect();
                      if (item.effectType === 'escape' || item.category === 'orb') {
                        handleUseItemOnTarget(item, 0);
                        return;
                      }
                      setSelectedBagItem(item);
                      setCombatMenu('BAG_TARGET');
                    }}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center justify-between text-left transition-colors cursor-pointer"
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
                  onClick={() => handleUseItemOnTarget(selectedBagItem, idx)}
                  className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-400 rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors"
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
                  <span className="text-xs font-bold text-emerald-400">Usar</span>
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
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* RECRUITMENT DECISION PROMPT */}
            {victoryState.recruitedPokemon ? (
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
