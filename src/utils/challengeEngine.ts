import type {
  CircuitBoardId,
  GearSpec,
  RotationDir,
  SwitchStateMap,
} from './physics';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

const DIFFICULTY_STORAGE_KEY = 'techcue_difficulty_v1';

export function isValidDifficulty(val: unknown): val is DifficultyLevel {
  return val === 'easy' || val === 'medium' || val === 'hard';
}

export function loadDifficultyPreference(): DifficultyLevel {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (isValidDifficulty(raw)) return raw;
  } catch {
    // Ignore storage errors
  }
  return 'medium';
}

export function saveDifficultyPreference(level: DifficultyLevel): void {
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
  } catch {
    // Ignore storage errors
  }
}

export function getDifficultyXpMultiplier(level: DifficultyLevel): number {
  switch (level) {
    case 'easy':
      return 1;
    case 'medium':
      return 1.35;
    case 'hard':
      return 1.75;
  }
}

/**
 * Deterministic Mulberry32 PRNG so any challenge seed + difficulty produces identical
 * puzzles on both the challenger's and the opponent's browsers with zero backend.
 */
export function hashSeedString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededRng(seed: string): () => number {
  let a = hashSeedString(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFreshSeedCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = 'TC-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/* ==================== PROCEDURAL GEARS ==================== */

export interface GeneratedGearQuiz {
  seed: string;
  difficulty: DifficultyLevel;
  gears: GearSpec[];
  motorDir: RotationDir;
  motorRpm: number;
}

export function generateGearQuiz(
  seed: string,
  difficulty: DifficultyLevel = 'medium'
): GeneratedGearQuiz {
  const rng = createSeededRng(`gear-quiz:${difficulty}:${seed}`);
  const toothPool =
    difficulty === 'easy'
      ? ([8, 12, 16, 24] as const)
      : difficulty === 'medium'
        ? ([8, 12, 16, 20, 24, 32] as const)
        : ([8, 10, 12, 16, 18, 20, 24, 32] as const);

  const count =
    difficulty === 'easy'
      ? 2
      : difficulty === 'medium'
        ? pick(rng, [2, 3, 3] as const)
        : pick(rng, [3, 4, 4, 5] as const);

  const gears: GearSpec[] = [];
  for (let i = 0; i < count; i++) {
    gears.push({
      id: `gq_${i}`,
      teeth: pick(rng, toothPool),
    });
  }

  if (gears[0].teeth === gears[gears.length - 1].teeth && rng() > 0.25) {
    const alts = toothPool.filter((z) => z !== gears[0].teeth);
    gears[gears.length - 1].teeth = pick(rng, alts);
  }

  const motorDir: RotationDir =
    difficulty === 'easy' ? 'cw' : rng() > 0.5 ? 'cw' : 'ccw';
  const motorRpm = pick(rng, [30, 40, 45, 60, 75] as const);
  return {seed, difficulty, gears, motorDir, motorRpm};
}

export interface GeneratedGearMission {
  seed: string;
  difficulty: DifficultyLevel;
  targetDir: RotationDir;
  targetRatio: number;
  motorDir: RotationDir;
}

export function generateGearBuilderMission(
  seed: string,
  difficulty: DifficultyLevel = 'medium'
): GeneratedGearMission {
  const rng = createSeededRng(`gear-build:${difficulty}:${seed}`);
  const targetDir: RotationDir = rng() > 0.5 ? 'cw' : 'ccw';
  const motorDir: RotationDir =
    difficulty === 'easy' ? 'cw' : rng() > 0.5 ? 'cw' : 'ccw';

  const ratioPool =
    difficulty === 'easy'
      ? ([0.5, 1, 2] as const)
      : difficulty === 'medium'
        ? ([0.5, 1, 1.5, 2, 3] as const)
        : ([0.38, 0.5, 0.75, 1.33, 1.5, 2.5, 2.67, 3, 4] as const);

  // Pick achievable exact ratios using {8,12,16,20,24,32}
  const cleanHardPool = [0.5, 0.75, 1.5, 2, 2.5, 3, 4] as const;
  const targetRatio =
    difficulty === 'hard' ? pick(rng, cleanHardPool) : pick(rng, ratioPool);

  return {seed, difficulty, targetDir, targetRatio, motorDir};
}

/* ==================== PROCEDURAL PULLEYS ==================== */

export interface GeneratedPulleyChallenge {
  seed: string;
  difficulty: DifficultyLevel;
  loadKg: number;
  maxEffortN: number;
  requireDownwardPull: boolean;
  exactMa?: number;
}

export function generatePulleyChallenge(
  seed: string,
  difficulty: DifficultyLevel = 'medium'
): GeneratedPulleyChallenge {
  const rng = createSeededRng(`pulley:${difficulty}:${seed}`);

  if (difficulty === 'easy') {
    const template = pick(rng, ['fixed', 'movable', 'block2'] as const);
    const loadKg = pick(rng, [20, 40, 60] as const);
    const loadN = loadKg * 10;
    if (template === 'fixed') {
      return {seed, difficulty, loadKg, maxEffortN: loadN, requireDownwardPull: true, exactMa: 1};
    }
    if (template === 'movable') {
      return {seed, difficulty, loadKg, maxEffortN: loadN / 2, requireDownwardPull: false, exactMa: 2};
    }
    return {seed, difficulty, loadKg, maxEffortN: loadN / 2, requireDownwardPull: true};
  }

  const template = pick(rng, ['fixed', 'movable', 'block2', 'compound4'] as const);
  const loadKg =
    difficulty === 'hard'
      ? pick(rng, [30, 50, 70, 90, 120] as const)
      : pick(rng, [20, 40, 60, 80, 100] as const);
  const loadN = loadKg * 10;

  switch (template) {
    case 'fixed':
      return {
        seed,
        difficulty,
        loadKg,
        maxEffortN: loadN,
        requireDownwardPull: true,
        exactMa: 1,
      };
    case 'movable':
      return {
        seed,
        difficulty,
        loadKg,
        maxEffortN: loadN / 2,
        requireDownwardPull: false,
        exactMa: 2,
      };
    case 'block2':
      return {
        seed,
        difficulty,
        loadKg,
        maxEffortN: loadN / 2,
        requireDownwardPull: true,
        exactMa: difficulty === 'hard' ? 2 : undefined,
      };
    case 'compound4':
      return {
        seed,
        difficulty,
        loadKg,
        maxEffortN: loadN / 4,
        requireDownwardPull: true,
        exactMa: difficulty === 'hard' ? 4 : undefined,
      };
  }
}

/* ==================== PROCEDURAL CIRCUITS ==================== */

export interface GeneratedCircuitPuzzle {
  seed: string;
  difficulty: DifficultyLevel;
  boardId: CircuitBoardId;
  initialSwitches: SwitchStateMap;
  targetL1: boolean;
  targetL2: boolean;
  targetMotor: boolean;
  requireSafe: boolean;
}

export function generateCircuitPuzzle(
  seed: string,
  difficulty: DifficultyLevel = 'medium'
): GeneratedCircuitPuzzle {
  const rng = createSeededRng(`circuit:${difficulty}:${seed}`);

  const boardPool: readonly CircuitBoardId[] =
    difficulty === 'easy'
      ? (['series', 'parallel'] as const)
      : difficulty === 'medium'
        ? (['series', 'parallel', 'mixed'] as const)
        : (['parallel', 'mixed', 'shortGuard'] as const);

  const boardId = pick(rng, boardPool);

  if (boardId === 'series') {
    const targetOn = difficulty === 'easy' ? true : rng() > 0.25;
    return {
      seed,
      difficulty,
      boardId,
      initialSwitches: targetOn
        ? {S1: rng() > 0.5, S2: false, S3: false}
        : {S1: true, S2: true, S3: false},
      targetL1: targetOn,
      targetL2: targetOn,
      targetMotor: false,
      requireSafe: true,
    };
  }

  if (boardId === 'parallel') {
    const combo = pick(rng, [
      {l1: false, l2: true},
      {l1: true, l2: false},
      {l1: true, l2: true},
    ] as const);
    return {
      seed,
      difficulty,
      boardId,
      initialSwitches: {S1: false, S2: !combo.l1, S3: !combo.l2},
      targetL1: combo.l1,
      targetL2: combo.l2,
      targetMotor: false,
      requireSafe: true,
    };
  }

  if (boardId === 'mixed') {
    const combo = pick(rng, [
      {l1: false, motor: true},
      {l1: true, motor: false},
      {l1: true, motor: true},
    ] as const);
    return {
      seed,
      difficulty,
      boardId,
      initialSwitches: {
        S1: difficulty === 'hard' ? false : true,
        S2: !combo.l1,
        S3: !combo.motor,
      },
      targetL1: combo.l1,
      targetL2: false,
      targetMotor: combo.motor,
      requireSafe: true,
    };
  }

  // shortGuard
  return {
    seed,
    difficulty,
    boardId: 'shortGuard',
    initialSwitches: {S1: true, S2: false, S3: true},
    targetL1: true,
    targetL2: false,
    targetMotor: false,
    requireSafe: true,
  };
}

/* ==================== PROCEDURAL BLITZ & DUEL DECK ==================== */

export type DynamicQuestionCategory = 'lever' | 'gear' | 'pulley' | 'circuit';

export type DynamicOptionLabelKey =
  | 'left'
  | 'balanced'
  | 'right'
  | 'cw'
  | 'ccw'
  | 'half'
  | 'quarter'
  | 'full'
  | 'allOff'
  | 'staysOn';

export interface DynamicQuestion {
  id: string;
  category: DynamicQuestionCategory;
  leftN?: number;
  leftDist?: number;
  rightN?: number;
  rightDist?: number;
  gearTeeth?: number[];
  motorDir?: RotationDir;
  pulleyRopes?: number;
  pulleyLoadN?: number;
  circuitSeriesOpen?: boolean;
  answerKey: string;
  options: Array<{key: string; labelKey: DynamicOptionLabelKey}>;
}

export function generateDynamicQuestionDeck(
  seed: string,
  count = 8,
  difficulty: DifficultyLevel = 'medium'
): DynamicQuestion[] {
  const rng = createSeededRng(`deck:${difficulty}:${seed}`);
  const categories: DynamicQuestionCategory[] = ['lever', 'gear', 'pulley', 'circuit'];
  const deck: DynamicQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const category = i < 4 ? categories[i] : pick(rng, categories);

    if (category === 'lever') {
      const distPool = difficulty === 'easy' ? ([1, 2] as const) : ([1, 2, 3] as const);
      const forcePool =
        difficulty === 'easy'
          ? ([10, 20, 30, 40] as const)
          : difficulty === 'medium'
            ? ([10, 15, 20, 25, 30, 40] as const)
            : ([12, 15, 18, 24, 25, 30, 35, 45] as const);

      const leftDist = pick(rng, distPool);
      const rightDist = pick(rng, distPool);
      const leftN = pick(rng, forcePool);
      const makeBalanced = rng() < 0.38;
      let rightN: number;
      if (makeBalanced && (leftN * leftDist) % rightDist === 0) {
        rightN = (leftN * leftDist) / rightDist;
      } else {
        rightN = pick(rng, forcePool);
      }
      const leftTorque = leftN * leftDist;
      const rightTorque = rightN * rightDist;
      const answerKey =
        leftTorque === rightTorque ? 'balanced' : leftTorque > rightTorque ? 'left' : 'right';

      deck.push({
        id: `${seed}_${difficulty}_${i}`,
        category: 'lever',
        leftN,
        leftDist,
        rightN,
        rightDist,
        answerKey,
        options: [
          {key: 'left', labelKey: 'left'},
          {key: 'balanced', labelKey: 'balanced'},
          {key: 'right', labelKey: 'right'},
        ],
      });
      continue;
    }

    if (category === 'gear') {
      const gearCount =
        difficulty === 'easy'
          ? pick(rng, [2, 3] as const)
          : difficulty === 'medium'
            ? pick(rng, [2, 3, 4] as const)
            : pick(rng, [3, 4, 5] as const);

      const gearTeeth: number[] = [];
      for (let g = 0; g < gearCount; g++) {
        gearTeeth.push(
          pick(
            rng,
            difficulty === 'hard'
              ? ([8, 10, 12, 16, 18, 24] as const)
              : ([10, 12, 16, 20, 24] as const)
          )
        );
      }
      const motorDir: RotationDir =
        difficulty === 'easy' ? 'cw' : rng() > 0.5 ? 'cw' : 'ccw';
      const flips = (gearCount - 1) % 2 === 1;
      const answerKey: RotationDir = flips
        ? motorDir === 'cw'
          ? 'ccw'
          : 'cw'
        : motorDir;

      deck.push({
        id: `${seed}_${difficulty}_${i}`,
        category: 'gear',
        gearTeeth,
        motorDir,
        answerKey,
        options: [
          {key: 'cw', labelKey: 'cw'},
          {key: 'ccw', labelKey: 'ccw'},
        ],
      });
      continue;
    }

    if (category === 'pulley') {
      const pulleyRopes =
        difficulty === 'easy'
          ? pick(rng, [1, 2] as const)
          : pick(rng, [1, 2, 4] as const);
      const pulleyLoadN =
        difficulty === 'easy'
          ? pick(rng, [100, 200, 400] as const)
          : difficulty === 'medium'
            ? pick(rng, [120, 200, 320, 400, 600] as const)
            : pick(rng, [180, 260, 360, 440, 520] as const);
      const answerKey = pulleyRopes === 1 ? 'full' : pulleyRopes === 2 ? 'half' : 'quarter';

      deck.push({
        id: `${seed}_${difficulty}_${i}`,
        category: 'pulley',
        pulleyRopes,
        pulleyLoadN,
        answerKey,
        options: [
          {key: 'full', labelKey: 'full'},
          {key: 'half', labelKey: 'half'},
          {key: 'quarter', labelKey: 'quarter'},
        ],
      });
      continue;
    }

    // circuit
    const circuitSeriesOpen = rng() > 0.45;
    deck.push({
      id: `${seed}_${difficulty}_${i}`,
      category: 'circuit',
      circuitSeriesOpen,
      answerKey: circuitSeriesOpen ? 'allOff' : 'staysOn',
      options: [
        {key: 'allOff', labelKey: 'allOff'},
        {key: 'staysOn', labelKey: 'staysOn'},
      ],
    });
  }

  return deck;
}

/* ==================== LINK DUEL ENCODING / DECODING ==================== */

export interface DuelPayload {
  seed: string;
  rounds: number;
  difficulty: DifficultyLevel;
  challengerName?: string;
  challengerScore?: number;
  challengerTimeSec?: number;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeDuelParam(payload: DuelPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeDuelParam(token: string | null | undefined): DuelPayload | null {
  if (!token) return null;
  const decoded = fromBase64Url(token);
  if (!decoded) return null;
  try {
    const obj = JSON.parse(decoded) as Partial<DuelPayload>;
    if (typeof obj.seed !== 'string' || obj.seed.length < 3 || typeof obj.rounds !== 'number') {
      return null;
    }
    return {
      seed: obj.seed,
      rounds: Math.max(3, Math.min(10, Math.round(obj.rounds))),
      difficulty: isValidDifficulty(obj.difficulty) ? obj.difficulty : 'medium',
      challengerName: typeof obj.challengerName === 'string' ? obj.challengerName.slice(0, 24) : undefined,
      challengerScore: typeof obj.challengerScore === 'number' ? Math.max(0, Math.round(obj.challengerScore)) : undefined,
      challengerTimeSec:
        typeof obj.challengerTimeSec === 'number' ? Math.max(1, Math.round(obj.challengerTimeSec)) : undefined,
    };
  } catch {
    return null;
  }
}

export function buildDuelShareUrl(payload: DuelPayload, lang: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + window.location.pathname);
  if (lang && lang !== 'en') {
    url.searchParams.set('lang', lang);
  }
  url.searchParams.set('duel', encodeDuelParam(payload));
  return url.toString();
}

export function readInitialDuelFromUrl(): DuelPayload | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return decodeDuelParam(params.get('duel'));
}

export function clearDuelFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('duel');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
