import {ArrowDown, ArrowUp, CheckCircle2, RotateCcw, XCircle} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import {
  createFreshSeedCode,
  generatePulleyChallenge,
  getDifficultyXpMultiplier,
  type DifficultyLevel,
  type GeneratedPulleyChallenge,
} from '../utils/challengeEngine';
import {computePulleyMetrics, type PulleyRigType} from '../utils/physics';
import {playClick, playError, playSuccess} from '../utils/sound';

interface PulleysModuleProps {
  t: TranslationDict;
  difficulty: DifficultyLevel;
  onAwardXp: (xp: number) => void;
}

export function PulleysModule({t, difficulty, onAwardXp}: PulleysModuleProps) {
  const [mode, setMode] = useState<'lab' | 'challenge'>('lab');
  const [rigType, setRigType] = useState<PulleyRigType>('block2');
  const [loadKg, setLoadKg] = useState(40);
  const [isLifted, setIsLifted] = useState(false);
  const [liftProgress, setLiftProgress] = useState(0);
  const progressRef = useRef(0);

  const [challengeCount, setChallengeCount] = useState(1);
  const [activeChallenge, setActiveChallenge] = useState<GeneratedPulleyChallenge>(() =>
    generatePulleyChallenge(createFreshSeedCode(), difficulty)
  );
  const [challengeFeedback, setChallengeFeedback] = useState<'idle' | 'ok' | 'err'>('idle');

  useEffect(() => {
    setActiveChallenge(generatePulleyChallenge(createFreshSeedCode(), difficulty));
    setChallengeFeedback('idle');
    setIsLifted(false);
  }, [difficulty]);

  const effectiveLoadKg = mode === 'challenge' ? activeChallenge.loadKg : loadKg;
  const maxLiftMeters = 2.0;

  useEffect(() => {
    let rafId = 0;
    const target = isLifted ? 1 : 0;

    const animate = () => {
      const diff = target - progressRef.current;
      if (Math.abs(diff) < 0.005) {
        progressRef.current = target;
        setLiftProgress(target);
        return;
      }
      progressRef.current += diff * 0.1;
      setLiftProgress(progressRef.current);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isLifted]);

  const currentLiftM = Number((liftProgress * maxLiftMeters).toFixed(2));
  const metrics = useMemo(
    () => computePulleyMetrics(rigType, effectiveLoadKg, currentLiftM),
    [rigType, effectiveLoadKg, currentLiftM]
  );

  const rigOptions: Array<{id: PulleyRigType; label: string}> = [
    {id: 'fixed', label: t.pulleys.rigFixed},
    {id: 'movable', label: t.pulleys.rigMovable},
    {id: 'block2', label: t.pulleys.rigBlock2},
    {id: 'compound4', label: t.pulleys.rigCompound4},
  ];

  const handleSelectRig = (id: PulleyRigType) => {
    playClick();
    setRigType(id);
    setIsLifted(false);
    setChallengeFeedback('idle');
  };

  const handleVerifyChallenge = () => {
    playClick();
    const effortOk = metrics.effortNewtons <= activeChallenge.maxEffortN + 0.1;
    const dirOk = !activeChallenge.requireDownwardPull || metrics.changesDirection;
    const maOk = !activeChallenge.exactMa || metrics.mechanicalAdvantage === activeChallenge.exactMa;

    if (effortOk && dirOk && maOk) {
      setChallengeFeedback('ok');
      setIsLifted(true);
      playSuccess();
      onAwardXp(Math.round(35 * getDifficultyXpMultiplier(difficulty)));
    } else {
      setChallengeFeedback('err');
      playError();
    }
  };

  const handleNextChallenge = () => {
    playClick();
    setActiveChallenge(generatePulleyChallenge(createFreshSeedCode(), difficulty));
    setChallengeCount((c) => c + 1);
    setChallengeFeedback('idle');
    setIsLifted(false);
  };

  const loadDropPx = 64 * (1 - liftProgress);
  const wheelRotDeg = liftProgress * 360 * metrics.mechanicalAdvantage;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Top Zone: Dark Instrument SVG Stage */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('lab');
                setChallengeFeedback('idle');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'lab' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.pulleys.modeLab}
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('challenge');
                setIsLifted(false);
                setChallengeFeedback('idle');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'challenge'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.pulleys.modeChallenge}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClick();
              setIsLifted((v) => !v);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#EA580C] px-3.5 text-xs font-semibold text-white hover:bg-orange-700 cursor-pointer whitespace-nowrap"
          >
            {isLifted ? (
              <>
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                {t.pulleys.lowerLoadBtn}
              </>
            ) : (
              <>
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                {t.pulleys.pullRopeBtn}
              </>
            )}
          </button>
        </div>

        <div className="drafting-stage flex min-h-[300px] items-center justify-center rounded-xl border border-slate-800 p-2">
          <svg viewBox="0 0 420 290" className="h-[280px] w-full select-none" role="img" aria-label={t.tabs.pulleys}>
            <rect x={40} y={14} width={340} height={14} rx={3} fill="#475569" />

            {rigType === 'fixed' && (
              <g>
                <line x1={200} y1={28} x2={200} y2={68} stroke="#94A3B8" strokeWidth={4} />
                <line x1={174} y1={68} x2={174} y2={155 + loadDropPx} stroke="#CBD5E1" strokeWidth={3} />
                <line x1={226} y1={68} x2={226} y2={175 + liftProgress * 55} stroke="#38BDF8" strokeWidth={3} />
                <PulleyWheel cx={200} cy={68} r={26} rot={wheelRotDeg} />
                <LoadBlock x={144} y={155 + loadDropPx} kg={effectiveLoadKg} />
                <PullArrow x={226} y={175 + liftProgress * 55} dir="down" effortN={metrics.effortNewtons} />
              </g>
            )}

            {rigType === 'movable' && (
              <g>
                <circle cx={154} cy={28} r={4} fill="#F8FAFC" />
                <line x1={154} y1={28} x2={154} y2={125 + loadDropPx} stroke="#CBD5E1" strokeWidth={3} />
                <line x1={206} y1={125 + loadDropPx} x2={206} y2={58} stroke="#38BDF8" strokeWidth={3} />
                <PulleyWheel cx={180} cy={125 + loadDropPx} r={26} rot={-wheelRotDeg} />
                <line
                  x1={180}
                  y1={125 + loadDropPx}
                  x2={180}
                  y2={170 + loadDropPx}
                  stroke="#94A3B8"
                  strokeWidth={4}
                />
                <LoadBlock x={150} y={170 + loadDropPx} kg={effectiveLoadKg} />
                <PullArrow x={206} y={58} dir="up" effortN={metrics.effortNewtons} />
              </g>
            )}

            {rigType === 'block2' && (
              <g>
                <line x1={200} y1={28} x2={200} y2={64} stroke="#94A3B8" strokeWidth={4} />
                <line
                  x1={174}
                  y1={135 + loadDropPx}
                  x2={174}
                  y2={175 + loadDropPx}
                  stroke="#94A3B8"
                  strokeWidth={4}
                />
                <line x1={150} y1={28} x2={150} y2={135 + loadDropPx} stroke="#CBD5E1" strokeWidth={3} />
                <line x1={198} y1={135 + loadDropPx} x2={178} y2={64} stroke="#CBD5E1" strokeWidth={3} />
                <line x1={222} y1={64} x2={252} y2={180 + liftProgress * 45} stroke="#38BDF8" strokeWidth={3} />

                <PulleyWheel cx={200} cy={64} r={22} rot={wheelRotDeg} />
                <PulleyWheel cx={174} cy={135 + loadDropPx} r={24} rot={-wheelRotDeg * 0.5} />
                <LoadBlock x={144} y={175 + loadDropPx} kg={effectiveLoadKg} />
                <PullArrow x={252} y={180 + liftProgress * 45} dir="down" effortN={metrics.effortNewtons} />
              </g>
            )}

            {rigType === 'compound4' && (
              <g>
                <line x1={190} y1={28} x2={190} y2={62} stroke="#94A3B8" strokeWidth={4} />
                <line x1={146} y1={28} x2={146} y2={135 + loadDropPx} stroke="#CBD5E1" strokeWidth={2.5} />
                <line x1={168} y1={62} x2={168} y2={135 + loadDropPx} stroke="#CBD5E1" strokeWidth={2.5} />
                <line x1={190} y1={62} x2={190} y2={135 + loadDropPx} stroke="#CBD5E1" strokeWidth={2.5} />
                <line x1={212} y1={62} x2={212} y2={135 + loadDropPx} stroke="#CBD5E1" strokeWidth={2.5} />
                <line x1={234} y1={62} x2={268} y2={175 + liftProgress * 55} stroke="#38BDF8" strokeWidth={3} />

                <PulleyWheel cx={190} cy={62} r={24} rot={wheelRotDeg} />
                <PulleyWheel cx={179} cy={135 + loadDropPx} r={24} rot={-wheelRotDeg * 0.5} />
                <line
                  x1={179}
                  y1={135 + loadDropPx}
                  x2={179}
                  y2={175 + loadDropPx}
                  stroke="#94A3B8"
                  strokeWidth={4}
                />
                <LoadBlock x={149} y={175 + loadDropPx} kg={effectiveLoadKg} />
                <PullArrow x={268} y={175 + liftProgress * 55} dir="down" effortN={metrics.effortNewtons} />
              </g>
            )}
          </svg>
        </div>

        {/* Live Physics Telemetry */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.pulleys.loadWeight}</p>
            <p className="font-mono-tabular text-sm font-bold text-slate-900">{metrics.loadNewtons} N</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.pulleys.effortForce}</p>
            <p className="font-mono-tabular text-sm font-bold text-[#1D4ED8]">{metrics.effortNewtons} N</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.pulleys.mechAdv}</p>
            <p className="font-mono-tabular text-sm font-bold text-[#047857]">
              {metrics.mechanicalAdvantage}x ({metrics.supportingRopes})
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.pulleys.ropePull}</p>
            <p className="font-mono-tabular text-sm font-bold text-slate-900">
              {metrics.ropePulledMeters} m / {metrics.liftMeters} m
            </p>
          </div>
        </div>
      </div>

      {/* Right / Bottom Zone: Controls & Challenges */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 lg:col-span-5">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{mode === 'lab' ? t.pulleys.rigType : t.pulleys.modeChallenge}</span>
            {mode === 'challenge' && (
              <span className="font-mono-tabular">
                #{challengeCount} · {activeChallenge.seed}
              </span>
            )}
          </div>

          {mode === 'challenge' && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5">
              <p className="text-xs font-medium text-slate-700">{t.pulleys.challengePrompt}</p>
              <p className="mt-1.5 font-mono-tabular text-sm font-bold text-slate-900">
                {t.pulleys.loadWeight}: {activeChallenge.loadKg * 10} N · {t.pulleys.effortForce} ≤{' '}
                {activeChallenge.maxEffortN} N
              </p>
              <p className="mt-1 text-xs font-semibold text-[#1D4ED8]">
                {activeChallenge.requireDownwardPull ? t.pulleys.directionChange : t.pulleys.sameDirection}
                {activeChallenge.exactMa ? ` · MA = ${activeChallenge.exactMa}x` : ''}
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2">
            {rigOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectRig(opt.id)}
                className={`flex h-11 items-center justify-between rounded-lg border px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                  rigType === opt.id
                    ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                <span className="font-mono-tabular text-[11px]">
                  {opt.id === 'fixed'
                    ? 'MA 1x'
                    : opt.id === 'movable'
                      ? 'MA 2x ↑'
                      : opt.id === 'block2'
                        ? 'MA 2x ↓'
                        : 'MA 4x ↓'}
                </span>
              </button>
            ))}
          </div>

          {mode === 'lab' && (
            <div className="mt-5 rounded-lg border border-slate-200 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <label htmlFor="pulley-load-slider">{t.pulleys.loadWeight}</label>
                <span className="font-mono-tabular text-[#1D4ED8]">
                  {loadKg} kg ({loadKg * 10} N)
                </span>
              </div>
              <input
                id="pulley-load-slider"
                type="range"
                min={10}
                max={100}
                step={10}
                value={loadKg}
                onChange={(e) => setLoadKg(Number(e.target.value))}
                className="mt-2.5 w-full accent-[#1D4ED8] cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          {mode === 'lab' ? (
            <p className="text-xs leading-relaxed text-slate-600">
              {metrics.changesDirection ? t.pulleys.directionChange : t.pulleys.sameDirection} ·{' '}
              {t.pulleys.supportingRopes}:{' '}
              <span className="font-mono-tabular font-bold">{metrics.supportingRopes}</span>
            </p>
          ) : (
            <div className="space-y-3">
              {challengeFeedback !== 'idle' && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs font-medium ${
                    challengeFeedback === 'ok'
                      ? 'border-emerald-200 bg-emerald-50 text-[#047857]'
                      : 'border-red-200 bg-red-50 text-[#DC2626]'
                  }`}
                >
                  {challengeFeedback === 'ok' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{challengeFeedback === 'ok' ? t.common.correct : t.common.tryAgain}</span>
                </div>
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleVerifyChallenge}
                  className="h-11 flex-1 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
                >
                  {t.pulleys.pickBestRig}
                </button>
                <button
                  type="button"
                  onClick={handleNextChallenge}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.nextChallenge}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PulleyWheel({cx, cy, r, rot}: {cx: number; cy: number; r: number; rot: number}) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <g transform={`rotate(${rot.toFixed(1)})`}>
        <circle cx={0} cy={0} r={r} fill="#78350F" stroke="#F59E0B" strokeWidth={3} />
        <line x1={-r + 4} y1={0} x2={r - 4} y2={0} stroke="#F59E0B" strokeWidth={2} />
        <line x1={0} y1={-r + 4} x2={0} y2={r - 4} stroke="#F59E0B" strokeWidth={2} />
      </g>
      <circle cx={0} cy={0} r={5} fill="#F8FAFC" />
    </g>
  );
}

function LoadBlock({x, y, kg}: {x: number; y: number; kg: number}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={60} height={42} rx={6} fill="#1E293B" stroke="#94A3B8" strokeWidth={2} />
      <text x={30} y={20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
        {kg} kg
      </text>
      <text x={30} y={34} textAnchor="middle" fontSize="10" fontWeight="600" fill="#94A3B8">
        {kg * 10} N
      </text>
    </g>
  );
}

function PullArrow({
  x,
  y,
  dir,
  effortN,
}: {
  x: number;
  y: number;
  dir: 'up' | 'down';
  effortN: number;
}) {
  const arrowY = dir === 'down' ? y + 28 : y - 28;
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={arrowY} stroke="#38BDF8" strokeWidth={3.5} />
      {dir === 'down' ? (
        <polygon points={`${x - 6},${arrowY - 2} ${x + 6},${arrowY - 2} ${x},${arrowY + 8}`} fill="#38BDF8" />
      ) : (
        <polygon points={`${x - 6},${arrowY + 2} ${x + 6},${arrowY + 2} ${x},${arrowY - 8}`} fill="#38BDF8" />
      )}
      <text
        x={x + 12}
        y={dir === 'down' ? arrowY + 4 : arrowY + 2}
        fontSize="11"
        fontWeight="700"
        fill="#38BDF8"
      >
        F = {effortN} N
      </text>
    </g>
  );
}
