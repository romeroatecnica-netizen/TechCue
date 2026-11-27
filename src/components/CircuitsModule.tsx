import {AlertTriangle, CheckCircle2, RotateCcw, Zap} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import {
  createFreshSeedCode,
  generateCircuitPuzzle,
  getDifficultyXpMultiplier,
  type DifficultyLevel,
  type GeneratedCircuitPuzzle,
} from '../utils/challengeEngine';
import {
  evaluateCircuit,
  type CircuitBoardId,
  type SwitchStateMap,
} from '../utils/physics';
import {playAlert, playClick, playError, playSuccess} from '../utils/sound';

interface CircuitsModuleProps {
  t: TranslationDict;
  difficulty: DifficultyLevel;
  onAwardXp: (xp: number) => void;
}

export function CircuitsModule({t, difficulty, onAwardXp}: CircuitsModuleProps) {
  const [mode, setMode] = useState<'puzzle' | 'sandbox'>('puzzle');
  const [puzzleCount, setPuzzleCount] = useState(1);
  const [activePuzzle, setActivePuzzle] = useState<GeneratedCircuitPuzzle>(() =>
    generateCircuitPuzzle(createFreshSeedCode(), difficulty)
  );
  const [boardId, setBoardId] = useState<CircuitBoardId>('series');
  const [switches, setSwitches] = useState<SwitchStateMap>(() => ({...activePuzzle.initialSwitches}));
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'err'>('idle');
  const [rotorDeg, setRotorDeg] = useState(0);
  const rotorRef = useRef(0);

  useEffect(() => {
    const next = generateCircuitPuzzle(createFreshSeedCode(), difficulty);
    setActivePuzzle(next);
    setSwitches({...next.initialSwitches});
    setFeedback('idle');
  }, [difficulty]);

  const currentBoard = mode === 'puzzle' ? activePuzzle.boardId : boardId;

  const evaluation = useMemo(
    () => evaluateCircuit(currentBoard, switches),
    [currentBoard, switches]
  );

  useEffect(() => {
    if (!evaluation.motorOn) return;
    let rafId = 0;
    let last = performance.now();
    const spin = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rotorRef.current = (rotorRef.current + dt * 360) % 360;
      setRotorDeg(rotorRef.current);
      rafId = requestAnimationFrame(spin);
    };
    rafId = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(rafId);
  }, [evaluation.motorOn]);

  useEffect(() => {
    if (evaluation.shortCircuit) {
      playAlert();
    }
  }, [evaluation.shortCircuit]);

  const toggleSwitch = (key: keyof SwitchStateMap) => {
    playClick();
    setSwitches((prev) => ({...prev, [key]: !prev[key]}));
    setFeedback('idle');
  };

  const handleBoardChange = (nextBoard: CircuitBoardId) => {
    playClick();
    setBoardId(nextBoard);
    setSwitches({S1: true, S2: false, S3: false});
    setFeedback('idle');
  };

  const handleCheckPuzzle = () => {
    playClick();
    const ok =
      evaluation.l1On === activePuzzle.targetL1 &&
      evaluation.l2On === activePuzzle.targetL2 &&
      evaluation.motorOn === activePuzzle.targetMotor &&
      (!activePuzzle.requireSafe || !evaluation.shortCircuit);

    if (ok) {
      setFeedback('ok');
      playSuccess();
      onAwardXp(Math.round(35 * getDifficultyXpMultiplier(difficulty)));
    } else {
      setFeedback('err');
      playError();
    }
  };

  const handleNextPuzzle = () => {
    playClick();
    const next = generateCircuitPuzzle(createFreshSeedCode(), difficulty);
    setActivePuzzle(next);
    setPuzzleCount((c) => c + 1);
    setSwitches({...next.initialSwitches});
    setFeedback('idle');
  };

  const handleResetSwitches = () => {
    playClick();
    if (mode === 'puzzle') {
      setSwitches({...activePuzzle.initialSwitches});
    } else {
      setSwitches({S1: false, S2: false, S3: false});
    }
    setFeedback('idle');
  };

  const visibleSwitches: Array<keyof SwitchStateMap> =
    currentBoard === 'series' ? ['S1', 'S2'] : ['S1', 'S2', 'S3'];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Top Zone: Dark Instrument SVG Circuit Board */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('puzzle');
                setSwitches({...activePuzzle.initialSwitches});
                setFeedback('idle');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'puzzle' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.circuits.modePuzzle}
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('sandbox');
                setFeedback('idle');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'sandbox' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.circuits.modeSandbox}
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetSwitches}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t.circuits.resetSwitches}
          </button>
        </div>

        {evaluation.shortCircuit ? (
          <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-[#DC2626]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">{t.circuits.shortCircuitAlert}</p>
              <p className="mt-0.5 text-red-700">{t.circuits.shortCircuitDetail}</p>
            </div>
          </div>
        ) : (
          <div
            className={`mb-3 flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold ${
              evaluation.circuitClosed
                ? 'border-emerald-200 bg-emerald-50 text-[#047857]'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{evaluation.circuitClosed ? t.circuits.circuitClosed : t.circuits.circuitOpen}</span>
          </div>
        )}

        <div className="drafting-stage flex min-h-[290px] items-center justify-center rounded-xl border border-slate-800 p-2">
          <svg viewBox="0 0 460 270" className="h-[260px] w-full select-none" role="img" aria-label={t.tabs.circuits}>
            {currentBoard === 'series' && (
              <g>
                <path
                  d="M 70 60 H 390 V 210 H 70 Z"
                  fill="none"
                  stroke="#475569"
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                {evaluation.circuitClosed && (
                  <path
                    d="M 70 60 H 390 V 210 H 70 Z"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}

                <SvgBattery x={70} y={135} label={t.circuits.batteryLabel} />
                <SvgSwitch x={170} y={60} label="S1" closed={switches.S1} onClick={() => toggleSwitch('S1')} />
                <SvgSwitch x={290} y={60} label="S2" closed={switches.S2} onClick={() => toggleSwitch('S2')} />
                <SvgBulb
                  x={390}
                  y={135}
                  label="L1"
                  lit={evaluation.l1On}
                  stateText={evaluation.l1On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
                <SvgBulb
                  x={230}
                  y={210}
                  label="L2"
                  lit={evaluation.l2On}
                  stateText={evaluation.l2On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
              </g>
            )}

            {currentBoard === 'parallel' && (
              <g>
                <path d="M 70 60 H 380 M 70 210 H 380 M 70 60 V 210" fill="none" stroke="#475569" strokeWidth={4} />
                <line x1={230} y1={60} x2={230} y2={210} stroke="#475569" strokeWidth={4} />
                <line x1={380} y1={60} x2={380} y2={210} stroke="#475569" strokeWidth={4} />

                {evaluation.activeSegments.trunk && (
                  <path
                    d="M 70 210 V 60 H 230"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}
                {evaluation.activeSegments.branch1 && (
                  <path
                    d="M 230 60 V 210 H 70"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}
                {evaluation.activeSegments.branch2 && (
                  <path
                    d="M 230 60 H 380 V 210 H 70"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}

                <SvgBattery x={70} y={135} label={t.circuits.batteryLabel} />
                <SvgSwitch x={140} y={60} label="S1" closed={switches.S1} onClick={() => toggleSwitch('S1')} />
                <SvgSwitch x={230} y={96} vertical label="S2" closed={switches.S2} onClick={() => toggleSwitch('S2')} />
                <SvgSwitch x={380} y={96} vertical label="S3" closed={switches.S3} onClick={() => toggleSwitch('S3')} />

                <SvgBulb
                  x={230}
                  y={162}
                  label="L1"
                  lit={evaluation.l1On}
                  stateText={evaluation.l1On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
                <SvgBulb
                  x={380}
                  y={162}
                  label="L2"
                  lit={evaluation.l2On}
                  stateText={evaluation.l2On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
              </g>
            )}

            {currentBoard === 'mixed' && (
              <g>
                <path d="M 70 60 H 380 M 70 210 H 380 M 70 60 V 210" fill="none" stroke="#475569" strokeWidth={4} />
                <line x1={230} y1={60} x2={230} y2={210} stroke="#475569" strokeWidth={4} />
                <line x1={380} y1={60} x2={380} y2={210} stroke="#475569" strokeWidth={4} />

                {evaluation.activeSegments.trunk && (
                  <path
                    d="M 70 210 V 60 H 230"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}
                {evaluation.activeSegments.bulbBranch && (
                  <path
                    d="M 230 60 V 210 H 70"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}
                {evaluation.activeSegments.motorBranch && (
                  <path
                    d="M 230 60 H 380 V 210 H 70"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}

                <SvgBattery x={70} y={135} label={t.circuits.batteryLabel} />
                <SvgSwitch x={140} y={60} label="S1" closed={switches.S1} onClick={() => toggleSwitch('S1')} />
                <SvgSwitch x={230} y={96} vertical label="S2" closed={switches.S2} onClick={() => toggleSwitch('S2')} />
                <SvgSwitch x={380} y={96} vertical label="S3" closed={switches.S3} onClick={() => toggleSwitch('S3')} />

                <SvgBulb
                  x={230}
                  y={162}
                  label="L1"
                  lit={evaluation.l1On}
                  stateText={evaluation.l1On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
                <SvgMotor
                  x={380}
                  y={162}
                  label="M1"
                  running={evaluation.motorOn}
                  rotorDeg={rotorDeg}
                  stateText={evaluation.motorOn ? t.circuits.motorRunning : t.circuits.motorStopped}
                />
              </g>
            )}

            {currentBoard === 'shortGuard' && (
              <g>
                <path d="M 70 60 H 370 V 210 H 70 Z" fill="none" stroke="#475569" strokeWidth={4} />
                <line x1={220} y1={60} x2={220} y2={210} stroke="#475569" strokeWidth={4} />

                {evaluation.shortCircuit && (
                  <path
                    d="M 70 210 V 60 H 220 V 210 Z"
                    fill="none"
                    stroke="#F87171"
                    strokeWidth={4.5}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}

                {evaluation.activeSegments.loadLoop && (
                  <path
                    d="M 70 210 V 60 H 370 V 210 Z"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    className="animate-circuit-flow"
                  />
                )}

                <SvgBattery x={70} y={135} label={t.circuits.batteryLabel} />
                <SvgSwitch x={140} y={60} label="S1" closed={switches.S1} onClick={() => toggleSwitch('S1')} />
                <SvgSwitch
                  x={220}
                  y={135}
                  vertical
                  label="S3 (Bypass)"
                  closed={switches.S3}
                  onClick={() => toggleSwitch('S3')}
                />
                <SvgSwitch x={295} y={60} label="S2" closed={switches.S2} onClick={() => toggleSwitch('S2')} />
                <SvgBulb
                  x={370}
                  y={135}
                  label="L1"
                  lit={evaluation.l1On}
                  stateText={evaluation.l1On ? t.circuits.bulbOn : t.circuits.bulbOff}
                />
              </g>
            )}
          </svg>
        </div>

        <p className="mt-3 text-xs text-slate-500">{t.circuits.toggleSwitchHint}</p>
      </div>

      {/* Right / Bottom Zone: Switches & Puzzles */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 lg:col-span-5">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{mode === 'puzzle' ? t.circuits.modePuzzle : t.circuits.modeSandbox}</span>
            {mode === 'puzzle' && (
              <span className="font-mono-tabular">
                #{puzzleCount} · {activePuzzle.seed}
              </span>
            )}
          </div>

          {mode === 'sandbox' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  {id: 'series', label: t.circuits.boardSeries},
                  {id: 'parallel', label: t.circuits.boardParallel},
                  {id: 'mixed', label: t.circuits.boardMixed},
                  {id: 'shortGuard', label: t.circuits.boardShortGuard},
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBoardChange(b.id)}
                  className={`h-10 rounded-lg border px-2.5 text-xs font-semibold transition-colors cursor-pointer truncate ${
                    boardId === b.id
                      ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
              <p className="text-xs font-semibold text-slate-600">{t.circuits.goalLabel}</p>
              <div className="mt-2 flex flex-wrap gap-3 font-mono-tabular text-xs font-bold text-slate-900">
                <span>
                  L1: {activePuzzle.targetL1 ? t.circuits.bulbOn : t.circuits.bulbOff}
                </span>
                {(currentBoard === 'series' || currentBoard === 'parallel') && (
                  <span>
                    L2: {activePuzzle.targetL2 ? t.circuits.bulbOn : t.circuits.bulbOff}
                  </span>
                )}
                {currentBoard === 'mixed' && (
                  <span>
                    M1: {activePuzzle.targetMotor ? t.circuits.motorRunning : t.circuits.motorStopped}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 space-y-2.5">
            {visibleSwitches.map((swKey) => {
              const closed = switches[swKey];
              return (
                <button
                  key={swKey}
                  type="button"
                  onClick={() => toggleSwitch(swKey)}
                  className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                    closed
                      ? 'border-[#047857] bg-emerald-50 text-[#047857]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    {t.circuits.switchLabel} {swKey}
                  </span>
                  <span className="font-mono-tabular font-bold">
                    {closed ? t.circuits.closedState : t.circuits.openState}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {mode === 'puzzle' && (
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
            {feedback !== 'idle' && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs font-medium ${
                  feedback === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-[#047857]'
                    : 'border-red-200 bg-red-50 text-[#DC2626]'
                }`}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{feedback === 'ok' ? t.circuits.goalSolved : t.common.tryAgain}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCheckPuzzle}
                className="h-11 flex-1 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
              >
                {t.common.checkAnswer}
              </button>
              <button
                type="button"
                onClick={handleNextPuzzle}
                className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                {t.common.nextChallenge}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SvgBattery({x, y, label}: {x: number; y: number; label: string}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-18} y={-22} width={36} height={44} rx={5} fill="#1E293B" stroke="#94A3B8" strokeWidth={2} />
      <text x={0} y={-7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#34D399">
        +
      </text>
      <text x={0} y={5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#FFFFFF">
        9V
      </text>
      <text x={0} y={17} textAnchor="middle" fontSize="11" fontWeight="700" fill="#94A3B8">
        −
      </text>
      <text x={-24} y={36} textAnchor="start" fontSize="10" fontWeight="600" fill="#CBD5E1">
        {label}
      </text>
    </g>
  );
}

function SvgSwitch({
  x,
  y,
  label,
  closed,
  vertical = false,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  closed: boolean;
  vertical?: boolean;
  onClick: () => void;
}) {
  return (
    <g
      transform={`translate(${x}, ${y}) ${vertical ? 'rotate(90)' : ''}`}
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <rect x={-22} y={-18} width={44} height={36} fill="transparent" />
      <line x1={-16} y1={0} x2={16} y2={0} stroke="#0B1220" strokeWidth={6} />
      <circle cx={-14} cy={0} r={4} fill="#F8FAFC" />
      <circle cx={14} cy={0} r={4} fill="#F8FAFC" />
      <line
        x1={-14}
        y1={0}
        x2={14}
        y2={closed ? 0 : -16}
        stroke={closed ? '#34D399' : '#F59E0B'}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <text
        x={0}
        y={vertical ? -16 : -22}
        transform={vertical ? 'rotate(-90 0 -16)' : undefined}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#E2E8F0"
      >
        {label}
      </text>
    </g>
  );
}

function SvgBulb({
  x,
  y,
  label,
  lit,
  stateText,
}: {
  x: number;
  y: number;
  label: string;
  lit: boolean;
  stateText: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {lit && <circle cx={0} cy={0} r={28} fill="#FBBF24" opacity={0.35} />}
      <circle
        cx={0}
        cy={0}
        r={18}
        fill={lit ? '#FBBF24' : '#1E293B'}
        stroke={lit ? '#F59E0B' : '#64748B'}
        strokeWidth={2.5}
      />
      <path d="M -6 5 Q 0 -8 6 5" fill="none" stroke={lit ? '#0B1220' : '#94A3B8'} strokeWidth={2} />
      <text x={0} y={-24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F8FAFC">
        {label} ({stateText})
      </text>
    </g>
  );
}

function SvgMotor({
  x,
  y,
  label,
  running,
  rotorDeg,
  stateText,
}: {
  x: number;
  y: number;
  label: string;
  running: boolean;
  rotorDeg: number;
  stateText: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        cx={0}
        cy={0}
        r={20}
        fill={running ? '#1E3A8A' : '#1E293B'}
        stroke={running ? '#38BDF8' : '#64748B'}
        strokeWidth={2.5}
      />
      <g transform={`rotate(${rotorDeg.toFixed(1)})`}>
        <line x1={-12} y1={0} x2={12} y2={0} stroke="#F8FAFC" strokeWidth={3} strokeLinecap="round" />
        <line x1={0} y1={-12} x2={0} y2={12} stroke="#F8FAFC" strokeWidth={3} strokeLinecap="round" />
      </g>
      <circle cx={0} cy={0} r={4} fill="#38BDF8" />
      <text x={0} y={-26} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F8FAFC">
        {label} ({stateText})
      </text>
    </g>
  );
}
