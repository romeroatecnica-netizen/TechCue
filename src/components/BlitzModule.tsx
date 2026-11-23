import {CheckCircle2, Play, RotateCcw, Timer, Trophy, XCircle} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import {createGearPath, evaluateLever} from '../utils/physics';
import {playClick, playError, playSuccess} from '../utils/sound';

interface BlitzModuleProps {
  t: TranslationDict;
  bestBlitzStreak: number;
  onRecordBlitzResult: (xp: number, streak: number) => void;
}

type BlitzCategory = 'lever' | 'gear' | 'pulley' | 'circuit';

interface BlitzQuestion {
  id: string;
  category: BlitzCategory;
  leftN?: number;
  leftDist?: number;
  rightN?: number;
  rightDist?: number;
  gearTeeth?: number[];
  pulleyRopes?: number;
  pulleyLoadN?: number;
  circuitSeriesOpen?: boolean;
  answerKey: string;
  options: Array<{key: string; labelKey: 'left' | 'balanced' | 'right' | 'cw' | 'ccw' | 'half' | 'quarter' | 'allOff' | 'staysOn'}>;
}

const BLITZ_DECK: BlitzQuestion[] = [
  {
    id: 'bz1',
    category: 'lever',
    leftN: 20,
    leftDist: 2,
    rightN: 40,
    rightDist: 1,
    answerKey: 'balanced',
    options: [
      {key: 'left', labelKey: 'left'},
      {key: 'balanced', labelKey: 'balanced'},
      {key: 'right', labelKey: 'right'},
    ],
  },
  {
    id: 'bz2',
    category: 'lever',
    leftN: 30,
    leftDist: 3,
    rightN: 40,
    rightDist: 2,
    answerKey: 'left',
    options: [
      {key: 'left', labelKey: 'left'},
      {key: 'balanced', labelKey: 'balanced'},
      {key: 'right', labelKey: 'right'},
    ],
  },
  {
    id: 'bz3',
    category: 'lever',
    leftN: 15,
    leftDist: 2,
    rightN: 20,
    rightDist: 3,
    answerKey: 'right',
    options: [
      {key: 'left', labelKey: 'left'},
      {key: 'balanced', labelKey: 'balanced'},
      {key: 'right', labelKey: 'right'},
    ],
  },
  {
    id: 'bz4',
    category: 'gear',
    gearTeeth: [12, 20, 16],
    answerKey: 'cw',
    options: [
      {key: 'cw', labelKey: 'cw'},
      {key: 'ccw', labelKey: 'ccw'},
    ],
  },
  {
    id: 'bz5',
    category: 'gear',
    gearTeeth: [16, 12],
    answerKey: 'ccw',
    options: [
      {key: 'cw', labelKey: 'cw'},
      {key: 'ccw', labelKey: 'ccw'},
    ],
  },
  {
    id: 'bz6',
    category: 'pulley',
    pulleyRopes: 2,
    pulleyLoadN: 200,
    answerKey: 'half',
    options: [
      {key: 'half', labelKey: 'half'},
      {key: 'quarter', labelKey: 'quarter'},
    ],
  },
  {
    id: 'bz7',
    category: 'pulley',
    pulleyRopes: 4,
    pulleyLoadN: 400,
    answerKey: 'quarter',
    options: [
      {key: 'half', labelKey: 'half'},
      {key: 'quarter', labelKey: 'quarter'},
    ],
  },
  {
    id: 'bz8',
    category: 'circuit',
    circuitSeriesOpen: true,
    answerKey: 'allOff',
    options: [
      {key: 'allOff', labelKey: 'allOff'},
      {key: 'staysOn', labelKey: 'staysOn'},
    ],
  },
  {
    id: 'bz9',
    category: 'circuit',
    circuitSeriesOpen: false,
    answerKey: 'staysOn',
    options: [
      {key: 'allOff', labelKey: 'allOff'},
      {key: 'staysOn', labelKey: 'staysOn'},
    ],
  },
];

export function BlitzModule({t, bestBlitzStreak, onRecordBlitzResult}: BlitzModuleProps) {
  const [timedMode, setTimedMode] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [deckIdx, setDeckIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  const q = BLITZ_DECK[deckIdx];

  useEffect(() => {
    if (!timedMode || !isRunning || roundDone) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRoundDone(true);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timedMode, isRunning, roundDone]);

  const multiplier = streak >= 6 ? 3 : streak >= 3 ? 2 : streak >= 1 ? 1.5 : 1;

  const leverEval = useMemo(() => {
    if (q.category !== 'lever') return null;
    return evaluateLever(q.leftN!, q.leftDist!, q.rightN!, q.rightDist!);
  }, [q]);

  const getOptionLabel = (labelKey: BlitzQuestion['options'][number]['labelKey']) => {
    switch (labelKey) {
      case 'left':
        return t.blitz.tiltsLeft;
      case 'balanced':
        return t.blitz.balanced;
      case 'right':
        return t.blitz.tiltsRight;
      case 'cw':
        return `↻ ${t.common.cw}`;
      case 'ccw':
        return `↺ ${t.common.ccw}`;
      case 'half':
        return `${(q.pulleyLoadN ?? 200) / 2} N (MA 2x)`;
      case 'quarter':
        return `${(q.pulleyLoadN ?? 400) / 4} N (MA 4x)`;
      case 'allOff':
        return t.circuits.circuitOpen;
      case 'staysOn':
        return t.circuits.circuitClosed;
    }
  };

  const handleSelectOption = (key: string) => {
    if (selectedKey !== null || roundDone) return;
    playClick();
    setSelectedKey(key);
    if (key === q.answerKey) {
      const nextStreak = streak + 1;
      const gained = Math.round(20 * multiplier);
      setStreak(nextStreak);
      setScore((s) => s + gained);
      playSuccess();
      onRecordBlitzResult(gained, nextStreak);
    } else {
      setStreak(0);
      playError();
      onRecordBlitzResult(0, 0);
    }
  };

  const handleNext = () => {
    playClick();
    setSelectedKey(null);
    setDeckIdx((prev) => (prev + 1) % BLITZ_DECK.length);
  };

  const handleStartTimed = () => {
    playClick();
    setTimedMode(true);
    setTimeLeft(60);
    setScore(0);
    setStreak(0);
    setSelectedKey(null);
    setRoundDone(false);
    setIsRunning(true);
  };

  const handleSwitchRelaxed = () => {
    playClick();
    setTimedMode(false);
    setRoundDone(false);
    setIsRunning(true);
    setSelectedKey(null);
  };

  const leverTilt = selectedKey !== null && leverEval ? leverEval.tiltDeg : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Top Zone: Dynamic SVG Visual Stage */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={handleSwitchRelaxed}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                !timedMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.blitz.relaxedMode}
            </button>
            <button
              type="button"
              onClick={handleStartTimed}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                timedMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.blitz.timedMode}
            </button>
          </div>

          <div className="flex items-center gap-4 font-mono-tabular text-xs font-bold">
            {timedMode && (
              <span className="inline-flex items-center gap-1 text-[#DC2626]">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {timeLeft}s
              </span>
            )}
            <span className="text-[#2563EB]">
              {t.blitz.scoreLabel}: {score}
            </span>
            <span className="text-[#D97706]">
              {t.blitz.streakLabel}: {streak} ({multiplier}x)
            </span>
          </div>
        </div>

        {/* SVG Question Visualizer */}
        <div className="blueprint-grid flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 p-3">
          {q.category === 'lever' && (
            <svg viewBox="0 0 420 230" className="h-[230px] w-full select-none" role="img" aria-label={t.blitz.leverBalanceLabel}>
              {/* Fulcrum triangle */}
              <polygon points="210,135 186,185 234,185" fill="#334155" />
              <text x={210} y={204} textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">
                {t.blitz.fulcrumLabel}
              </text>

              {/* Tilting Beam */}
              <g
                transform={`translate(210, 132) rotate(${leverTilt})`}
                style={{transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'}}
              >
                <rect x={-165} y={-6} width={330} height={12} rx={4} fill="#D97706" />
                {/* Distance ticks */}
                {[-3, -2, -1, 1, 2, 3].map((m) => (
                  <g key={m} transform={`translate(${m * 48}, 0)`}>
                    <line x1={0} y1={-6} x2={0} y2={6} stroke="#FFFFFF" strokeWidth={2} />
                    <text x={0} y={20} textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">
                      {Math.abs(m)}m
                    </text>
                  </g>
                ))}

                {/* Left Weight */}
                <g transform={`translate(${-(q.leftDist ?? 1) * 48}, -38)`}>
                  <rect x={-24} y={0} width={48} height={32} rx={4} fill="#2563EB" />
                  <text x={0} y={20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
                    {q.leftN} N
                  </text>
                </g>

                {/* Right Weight */}
                <g transform={`translate(${(q.rightDist ?? 1) * 48}, -38)`}>
                  <rect x={-24} y={0} width={48} height={32} rx={4} fill="#059669" />
                  <text x={0} y={20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
                    {q.rightN} N
                  </text>
                </g>
              </g>
            </svg>
          )}

          {q.category === 'gear' && q.gearTeeth && (
            <svg viewBox="-40 -90 300 180" className="h-[220px] w-full select-none" role="img" aria-label={t.tabs.gears}>
              {q.gearTeeth.map((teeth, idx) => {
                const cx = idx * 78;
                const fill = idx === 0 ? '#DBEAFE' : idx === q.gearTeeth!.length - 1 ? '#FEF3C7' : '#F1F5F9';
                const stroke = idx === 0 ? '#2563EB' : idx === q.gearTeeth!.length - 1 ? '#D97706' : '#475569';
                return (
                  <g key={idx} transform={`translate(${cx}, 0)`}>
                    <path d={createGearPath(teeth, 1.9)} fill={fill} stroke={stroke} strokeWidth={2} />
                    <circle cx={0} cy={0} r={4} fill="#0F172A" />
                    <text x={0} y={48} textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">
                      {teeth}Z {idx === 0 ? '(↻ CW)' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {q.category === 'pulley' && (
            <svg viewBox="0 0 320 220" className="h-[220px] w-full select-none" role="img" aria-label={t.tabs.pulleys}>
              <rect x={50} y={16} width={220} height={12} rx={3} fill="#334155" />
              {Array.from({length: q.pulleyRopes ?? 2}).map((_, idx) => (
                <line
                  key={idx}
                  x1={120 + idx * 24}
                  y1={28}
                  x2={120 + idx * 24}
                  y2={125}
                  stroke="#0F172A"
                  strokeWidth={3}
                />
              ))}
              <circle cx={145} cy={125} r={22} fill="#FEF3C7" stroke="#D97706" strokeWidth={3} />
              <rect x={115} y={154} width={60} height={36} rx={5} fill="#1E293B" />
              <text x={145} y={176} textAnchor="middle" fontSize="12" fontWeight="700" fill="#FFFFFF">
                {q.pulleyLoadN} N
              </text>
            </svg>
          )}

          {q.category === 'circuit' && (
            <svg viewBox="0 0 360 210" className="h-[210px] w-full select-none" role="img" aria-label={t.tabs.circuits}>
              <rect
                x={60}
                y={40}
                width={240}
                height={130}
                fill="none"
                stroke={q.circuitSeriesOpen ? '#94A3B8' : '#059669'}
                strokeWidth={4}
              />
              {!q.circuitSeriesOpen && (
                <line x1={165} y1={40} x2={165} y2={170} stroke="#059669" strokeWidth={4} />
              )}
              <rect x={44} y={85} width={32} height={40} rx={4} fill="#1E293B" />
              <text x={60} y={109} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
                9V
              </text>
              <circle cx={300} cy={105} r={16} fill={q.circuitSeriesOpen ? '#E2E8F0' : '#FBBF24'} stroke="#475569" strokeWidth={2.5} />
              <text x={180} y={24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0F172A">
                {q.circuitSeriesOpen ? t.circuits.boardSeries : t.circuits.boardParallel}
              </text>
            </svg>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#D97706]" aria-hidden="true" />
            {t.blitz.bestStreakLabel}: <span className="font-mono-tabular text-slate-900">{bestBlitzStreak}</span>
          </span>
          <span className="font-mono-tabular">
            {deckIdx + 1} / {BLITZ_DECK.length}
          </span>
        </div>
      </div>

      {/* Right / Bottom Zone: Question Card */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
        {roundDone ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <Trophy className="h-10 w-10 text-[#D97706]" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-bold text-slate-900">{t.blitz.roundComplete}</h3>
            <p className="mt-2 font-mono-tabular text-2xl font-extrabold text-[#2563EB]">
              {score} {t.blitz.scoreLabel}
            </p>
            <button
              type="button"
              onClick={handleStartTimed}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t.blitz.playAgain}
            </button>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.blitz.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.blitz.subtitle}</p>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm font-semibold text-slate-900">
                {q.category === 'lever' &&
                  `${t.blitz.leverBalanceLabel}: ${q.leftN}N × ${q.leftDist}m vs ${q.rightN}N × ${q.rightDist}m`}
                {q.category === 'gear' && t.gears.questionDir}
                {q.category === 'pulley' &&
                  `${t.pulleys.effortForce}: ${q.pulleyLoadN} N · ${t.pulleys.supportingRopes} = ${q.pulleyRopes}`}
                {q.category === 'circuit' &&
                  (q.circuitSeriesOpen
                    ? `${t.circuits.boardSeries} (${t.circuits.switchLabel}: ${t.circuits.openState})`
                    : `${t.circuits.boardParallel} (1 Branch ${t.circuits.openState})`)}
              </div>

              <div className="mt-4 space-y-2.5">
                {q.options.map((opt) => {
                  const isPicked = selectedKey === opt.key;
                  const isRight = opt.key === q.answerKey;
                  let style = 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
                  if (selectedKey !== null) {
                    if (isRight) {
                      style = 'border-[#059669] bg-emerald-50 text-[#059669]';
                    } else if (isPicked) {
                      style = 'border-[#DC2626] bg-red-50 text-[#DC2626]';
                    }
                  }
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={selectedKey !== null}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span>{getOptionLabel(opt.labelKey)}</span>
                      {selectedKey !== null && isRight && (
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      {selectedKey !== null && isPicked && !isRight && (
                        <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t.common.nextChallenge}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
