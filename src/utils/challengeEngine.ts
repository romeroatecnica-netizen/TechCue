import type {
  CircuitBoardId,
  GearSpec,
  PulleyRigType,
  RotationDir,
  SwitchStateMap,
} from './physics';

/**
 * Deterministic Mulberry32 PRNG so any challenge seed produces identical puzzles
 * on both the challenger's and the opponent's browsers with zero backend.
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
  gears: GearSpec[];
  motorDir: RotationDir;
  motorRpm: number;
}

const QUIZ_TOOTH_POOL = [8, 12, 16, 20, 24, 32] as const;

export function generateGearQuiz(seed: string): GeneratedGearQuiz {
  const rng = createSeededRng(`gear-quiz:${seed}`);
  const count = pick(rng, [2, 3, 3, 4] as const);
  const gears: GearSpec[] = [];
  for (let i = 0; i < count; i++) {
    gears.push({
      id: `gq_${i}`,
      teeth: pick(rng, QUIZ_TOOTH_POOL),
    });
  }
  // Ensure variety between first and last gear on most rounds
  if (gears[0].teeth === gears[gears.length - 1].teeth && rng() > 0.25) {
    const alts = QUIZ_TOOTH_POOL.filter((z) => z !== gears[0].teeth);
    gears[gears.length - 1].teeth = pick(rng, alts);
  }
  const motorDir: RotationDir = rng() > 0.5 ? 'cw' : 'ccw';
  const motorRpm = pick(rng, [30, 40, 45, 60, 75] as const);
  return {seed, gears, motorDir, motorRpm};
}

export interface GeneratedGearMission {
  seed: string;
  targetDir: RotationDir;
  targetRatio: number;
  motorDir: RotationDir;
}

const VALID_BUILDER_RATIOS = [0.5, 1, 1.5, 2, 2.5, 3, 4] as const;

export function generateGearBuilderMission(seed: string): GeneratedGearMission {
  const rng = createSeededRng(`gear-build:${seed}`);
  const targetDir: RotationDir = rng() > 0.5 ? 'cw' : 'ccw';
  const motorDir: RotationDir = rng() > 0.5 ? 'cw' : 'ccw';
  const targetRatio = pick(rng, VALID_BUILDER_RATIOS);
  return {seed, targetDir, targetRatio, motorDir};
}

/* ==================== PROCEDURAL PULLEYS ==================== */

export interface GeneratedPulleyChallenge {
  seed: string;
  loadKg: number;
  maxEffortN: number;
  requireDownwardPull: boolean;
  exactMa?: number;
}

export function generatePulleyChallenge(seed: string): GeneratedPulleyChallenge {
  const rng = createSeededRng(`pulley:${seed}`);
  const template = pick(rng, ['fixed', 'movable', 'block2', 'compound4'] as const);
  const loadKg = pick(rng, [20, 40, 60, 80, 100] as const);
  const loadN = loadKg * 10;

  switch (template) {
    case 'fixed':
      return {
        seed,
        loadKg,
        maxEffortN: loadN,
        requireDownwardPull: true,
        exactMa: 1,
      };
    case 'movable':
      return {
        seed,
        loadKg,
        maxEffortN: loadN / 2,
        requireDownwardPull: false,
        exactMa: 2,
      };
    case 'block2':
      return {
        seed,
        loadKg,
        maxEffortN: loadN / 2,
        requireDownwardPull: true,
      };
    case 'compound4':
      return {
        seed,
        loadKg,
        maxEffortN: loadN / 4,
        requireDownwardPull: true,
      };
  }
}

/* ==================== PROCEDURAL CIRCUITS ==================== */

export interface GeneratedCircuitPuzzle {
  seed: string;
  boardId: CircuitBoardId;
  initialSwitches: SwitchStateMap;
  targetL1: boolean;
  targetL2: boolean;
  targetMotor: boolean;
  requireSafe: boolean;
}

export function generateCircuitPuzzle(seed: string): GeneratedCircuitPuzzle {
  const rng = createSeededRng(`circuit:${seed}`);
  const boardId = pick(rng, ['series', 'parallel', 'mixed', 'shortGuard'] as const);

  if (boardId === 'series') {
    const targetOn = rng() > 0.25;
    return {
      seed,
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
      boardId,
      initialSwitches: {S1: true, S2: !combo.l1, S3: !combo.motor},
      targetL1: combo.l1,
      targetL2: false,
      targetMotor: combo.motor,
      requireSafe: true,
    };
  }

  // shortGuard
  return {
    seed,
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

export function generateDynamicQuestionDeck(seed: string, count = 8): DynamicQuestion[] {
  const rng = createSeededRng(`deck:${seed}`);
  const categories: DynamicQuestionCategory[] = ['lever', 'gear', 'pulley', 'circuit'];
  const deck: DynamicQuestion[] = [];

  for (let i = 0; i < count; i++) {
    // Rotate categories first, then randomize
    const category = i < 4 ? categories[i] : pick(rng, categories);

    if (category === 'lever') {
      const leftDist = pick(rng, [1, 2, 3] as const);
      const rightDist = pick(rng, [1, 2, 3] as const);
      const leftN = pick(rng, [10, 15, 20, 25, 30, 40] as const);
      // Mix balanced and unbalanced cases cleanly
      const makeBalanced = rng() < 0.38;
      let rightN: number;
      if (makeBalanced && (leftN * leftDist) % rightDist === 0) {
        rightN = (leftN * leftDist) / rightDist;
      } else {
        rightN = pick(rng, [10, 15, 20, 25, 30, 40, 45] as const);
      }
      const leftTorque = leftN * leftDist;
      const rightTorque = rightN * rightDist;
      const answerKey =
        leftTorque === rightTorque ? 'balanced' : leftTorque > rightTorque ? 'left' : 'right';

      deck.push({
        id: `${seed}_${i}`,
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
      const gearCount = pick(rng, [2, 3, 4] as const);
      const gearTeeth: number[] = [];
      for (let g = 0; g < gearCount; g++) {
        gearTeeth.push(pick(rng, [10, 12, 16, 20, 24] as const));
      }
      const motorDir: RotationDir = rng() > 0.5 ? 'cw' : 'ccw';
      const flips = (gearCount - 1) % 2 === 1;
      const answerKey: RotationDir = flips
        ? motorDir === 'cw'
          ? 'ccw'
          : 'cw'
        : motorDir;

      deck.push({
        id: `${seed}_${i}`,
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
      const pulleyRopes = pick(rng, [1, 2, 4] as const);
      const pulleyLoadN = pick(rng, [120, 200, 320, 400, 600] as const);
      const answerKey = pulleyRopes === 1 ? 'full' : pulleyRopes === 2 ? 'half' : 'quarter';

      deck.push({
        id: `${seed}_${i}`,
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
      id: `${seed}_${i}`,
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
