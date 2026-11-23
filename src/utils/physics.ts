export type RotationDir = 'cw' | 'ccw';

export interface GearSpec {
  id: string;
  teeth: number;
}

export interface GearKinematics {
  id: string;
  teeth: number;
  pitchRadius: number;
  cx: number;
  cy: number;
  direction: RotationDir;
  rpm: number;
  phaseOffsetDeg: number;
}

const MODULE_PITCH = 2.6;

export function getGearPitchRadius(teeth: number): number {
  return teeth * MODULE_PITCH;
}

export function createGearPath(teeth: number, modulePitch = MODULE_PITCH): string {
  const pitchR = teeth * modulePitch;
  const addendum = modulePitch * 0.92;
  const dedendum = modulePitch * 1.1;
  const outerR = pitchR + addendum;
  const rootR = Math.max(8, pitchR - dedendum);

  const step = (Math.PI * 2) / teeth;
  const commands: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * step;
    const a0 = baseAngle;
    const a1 = baseAngle + step * 0.16;
    const a2 = baseAngle + step * 0.28;
    const a3 = baseAngle + step * 0.56;
    const a4 = baseAngle + step * 0.68;

    const p0x = Math.cos(a0) * rootR;
    const p0y = Math.sin(a0) * rootR;
    const p1x = Math.cos(a1) * rootR;
    const p1y = Math.sin(a1) * rootR;
    const p2x = Math.cos(a2) * outerR;
    const p2y = Math.sin(a2) * outerR;
    const p3x = Math.cos(a3) * outerR;
    const p3y = Math.sin(a3) * outerR;
    const p4x = Math.cos(a4) * rootR;
    const p4y = Math.sin(a4) * rootR;

    if (i === 0) {
      commands.push(`M ${p0x.toFixed(2)} ${p0y.toFixed(2)}`);
    } else {
      commands.push(`L ${p0x.toFixed(2)} ${p0y.toFixed(2)}`);
    }
    commands.push(`L ${p1x.toFixed(2)} ${p1y.toFixed(2)}`);
    commands.push(`L ${p2x.toFixed(2)} ${p2y.toFixed(2)}`);
    commands.push(`L ${p3x.toFixed(2)} ${p3y.toFixed(2)}`);
    commands.push(`L ${p4x.toFixed(2)} ${p4y.toFixed(2)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}

export function computeGearTrainKinematics(
  gears: GearSpec[],
  driverRpm: number,
  driverDir: RotationDir
): GearKinematics[] {
  if (gears.length === 0) return [];
  const result: GearKinematics[] = [];

  for (let i = 0; i < gears.length; i++) {
    const gear = gears[i];
    const pitchR = getGearPitchRadius(gear.teeth);
    if (i === 0) {
      result.push({
        id: gear.id,
        teeth: gear.teeth,
        pitchRadius: pitchR,
        cx: 0,
        cy: 0,
        direction: driverDir,
        rpm: driverRpm,
        phaseOffsetDeg: 0,
      });
    } else {
      const prev = result[i - 1];
      const cx = prev.cx + prev.pitchRadius + pitchR + 1.2;
      const direction: RotationDir = prev.direction === 'cw' ? 'ccw' : 'cw';
      const rpm = prev.rpm * (prev.teeth / gear.teeth);
      // Align tooth valley with neighbor tooth tip
      const halfToothDeg = 180 / gear.teeth;
      const phaseOffsetDeg = halfToothDeg;
      result.push({
        id: gear.id,
        teeth: gear.teeth,
        pitchRadius: pitchR,
        cx,
        cy: 0,
        direction,
        rpm,
        phaseOffsetDeg,
      });
    }
  }
  return result;
}

export type PulleyRigType = 'fixed' | 'movable' | 'block2' | 'compound4';

export interface PulleyMetrics {
  rigType: PulleyRigType;
  mechanicalAdvantage: number;
  supportingRopes: number;
  changesDirection: boolean;
  loadNewtons: number;
  effortNewtons: number;
  liftMeters: number;
  ropePulledMeters: number;
}

export function computePulleyMetrics(
  rigType: PulleyRigType,
  loadKg: number,
  liftMeters: number
): PulleyMetrics {
  const g = 10; // Clean didactic gravity constant (10 m/s^2)
  const loadNewtons = Math.round(loadKg * g);
  let mechanicalAdvantage = 1;
  let supportingRopes = 1;
  let changesDirection = true;

  switch (rigType) {
    case 'fixed':
      mechanicalAdvantage = 1;
      supportingRopes = 1;
      changesDirection = true;
      break;
    case 'movable':
      mechanicalAdvantage = 2;
      supportingRopes = 2;
      changesDirection = false;
      break;
    case 'block2':
      mechanicalAdvantage = 2;
      supportingRopes = 2;
      changesDirection = true;
      break;
    case 'compound4':
      mechanicalAdvantage = 4;
      supportingRopes = 4;
      changesDirection = true;
      break;
  }

  const effortNewtons = Number((loadNewtons / mechanicalAdvantage).toFixed(1));
  const ropePulledMeters = Number((liftMeters * mechanicalAdvantage).toFixed(2));

  return {
    rigType,
    mechanicalAdvantage,
    supportingRopes,
    changesDirection,
    loadNewtons,
    effortNewtons,
    liftMeters,
    ropePulledMeters,
  };
}

export type CircuitBoardId = 'series' | 'parallel' | 'mixed' | 'shortGuard';

export interface SwitchStateMap {
  S1: boolean;
  S2: boolean;
  S3: boolean;
}

export interface CircuitEvaluation {
  boardId: CircuitBoardId;
  shortCircuit: boolean;
  circuitClosed: boolean;
  l1On: boolean;
  l2On: boolean;
  motorOn: boolean;
  activeSegments: Record<string, boolean>;
}

export function evaluateCircuit(
  boardId: CircuitBoardId,
  switches: SwitchStateMap
): CircuitEvaluation {
  if (boardId === 'series') {
    const closed = switches.S1 && switches.S2;
    return {
      boardId,
      shortCircuit: false,
      circuitClosed: closed,
      l1On: closed,
      l2On: closed,
      motorOn: false,
      activeSegments: {
        mainTop: closed,
        mainRight: closed,
        mainBottom: closed,
        mainLeft: closed,
      },
    };
  }

  if (boardId === 'parallel') {
    const main = switches.S1;
    const branch1 = main && switches.S2;
    const branch2 = main && switches.S3;
    const anyOn = branch1 || branch2;
    return {
      boardId,
      shortCircuit: false,
      circuitClosed: anyOn,
      l1On: branch1,
      l2On: branch2,
      motorOn: false,
      activeSegments: {
        trunk: anyOn,
        branch1,
        branch2,
      },
    };
  }

  if (boardId === 'mixed') {
    const main = switches.S1;
    const bulbBranch = main && switches.S2;
    const motorBranch = main && switches.S3;
    const anyOn = bulbBranch || motorBranch;
    return {
      boardId,
      shortCircuit: false,
      circuitClosed: anyOn,
      l1On: bulbBranch,
      l2On: false,
      motorOn: motorBranch,
      activeSegments: {
        trunk: anyOn,
        bulbBranch,
        motorBranch,
      },
    };
  }

  // shortGuard board: S1 is main switch, S2 is load branch, S3 is direct bypass wire across battery
  const main = switches.S1;
  const bypassClosed = main && switches.S3;
  if (bypassClosed) {
    return {
      boardId,
      shortCircuit: true,
      circuitClosed: false,
      l1On: false,
      l2On: false,
      motorOn: false,
      activeSegments: {
        shortLoop: true,
      },
    };
  }
  const loadOn = main && switches.S2;
  return {
    boardId,
    shortCircuit: false,
    circuitClosed: loadOn,
    l1On: loadOn,
    l2On: false,
    motorOn: false,
    activeSegments: {
      loadLoop: loadOn,
    },
  };
}

export interface LeverEvaluation {
  leftTorque: number;
  rightTorque: number;
  tiltDeg: number;
  outcome: 'left' | 'balanced' | 'right';
}

export function evaluateLever(
  leftForceN: number,
  leftDistM: number,
  rightForceN: number,
  rightDistM: number
): LeverEvaluation {
  const leftTorque = leftForceN * leftDistM;
  const rightTorque = rightForceN * rightDistM;
  const diff = rightTorque - leftTorque;
  if (Math.abs(diff) < 0.01) {
    return {leftTorque, rightTorque, tiltDeg: 0, outcome: 'balanced'};
  }
  const tiltDeg = diff > 0 ? 11 : -11;
  return {
    leftTorque,
    rightTorque,
    tiltDeg,
    outcome: diff > 0 ? 'right' : 'left',
  };
}
