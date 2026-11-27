import {CheckCircle2, Minus, Play, Plus, RotateCcw, Square, XCircle} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import {
  createFreshSeedCode,
  generateGearBuilderMission,
  generateGearQuiz,
  type GeneratedGearMission,
  type GeneratedGearQuiz,
} from '../utils/challengeEngine';
import {
  computeGearTrainKinematics,
  createGearPath,
  type GearSpec,
  type RotationDir,
} from '../utils/physics';
import {playClick, playError, playSuccess} from '../utils/sound';

interface GearsModuleProps {
  t: TranslationDict;
  onAwardXp: (xp: number) => void;
}

const TOOTH_OPTIONS = [8, 12, 16, 20, 24, 32];

export function GearsModule({t, onAwardXp}: GearsModuleProps) {
  const [mode, setMode] = useState<'challenge' | 'builder'>('challenge');

  // Procedural Challenge state
  const [quizCount, setQuizCount] = useState(1);
  const [activeQuiz, setActiveQuiz] = useState<GeneratedGearQuiz>(() =>
    generateGearQuiz(createFreshSeedCode())
  );
  const [guessDir, setGuessDir] = useState<RotationDir | null>(null);
  const [guessSpeed, setGuessSpeed] = useState<'faster' | 'same' | 'slower' | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'idle' | 'ok' | 'err'>('idle');

  // Procedural Builder state
  const [missionCount, setMissionCount] = useState(1);
  const [activeMission, setActiveMission] = useState<GeneratedGearMission>(() =>
    generateGearBuilderMission(createFreshSeedCode())
  );
  const [builderGears, setBuilderGears] = useState<GearSpec[]>([
    {id: 'b_g1', teeth: 12},
    {id: 'b_g2', teeth: 16},
  ]);
  const [builderMotorDir, setBuilderMotorDir] = useState<RotationDir>('cw');
  const [builderFeedback, setBuilderFeedback] = useState<'idle' | 'ok' | 'err'>('idle');

  // Animation state
  const [isSpinning, setIsSpinning] = useState(true);
  const [anglesDeg, setAnglesDeg] = useState<number[]>([0, 0, 0, 0]);
  const anglesRef = useRef<number[]>([0, 0, 0, 0]);

  const activeGears = mode === 'challenge' ? activeQuiz.gears : builderGears;
  const activeMotorDir = mode === 'challenge' ? activeQuiz.motorDir : builderMotorDir;
  const activeMotorRpm = mode === 'challenge' ? activeQuiz.motorRpm : 45;

  const kinematics = useMemo(
    () => computeGearTrainKinematics(activeGears, activeMotorRpm, activeMotorDir),
    [activeGears, activeMotorRpm, activeMotorDir]
  );

  useEffect(() => {
    if (!isSpinning) return;
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const next = [...anglesRef.current];
      kinematics.forEach((k, idx) => {
        const degPerSec = (k.rpm * 360) / 60;
        const sign = k.direction === 'cw' ? 1 : -1;
        next[idx] = ((next[idx] ?? 0) + sign * degPerSec * dt) % 360;
      });
      anglesRef.current = next;
      setAnglesDeg(next);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isSpinning, kinematics]);

  const svgViewBox = useMemo(() => {
    if (kinematics.length === 0) return '-100 -100 200 200';
    const first = kinematics[0];
    const last = kinematics[kinematics.length - 1];
    const maxR = Math.max(...kinematics.map((k) => k.pitchRadius)) + 16;
    const minX = first.cx - first.pitchRadius - 22;
    const maxX = last.cx + last.pitchRadius + 22;
    const width = Math.max(260, maxX - minX);
    const height = Math.max(190, maxR * 2 + 34);
    return `${minX.toFixed(1)} ${(-height / 2).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
  }, [kinematics]);

  const firstGear = kinematics[0];
  const lastGear = kinematics[kinematics.length - 1];
  const totalRatio = Number((lastGear.teeth / firstGear.teeth).toFixed(2));

  const handleCheckQuiz = () => {
    if (!guessDir || !guessSpeed) return;
    playClick();
    const expectedDir = lastGear.direction;
    const expectedSpeed: 'faster' | 'same' | 'slower' =
      lastGear.rpm > firstGear.rpm + 0.01
        ? 'faster'
        : lastGear.rpm < firstGear.rpm - 0.01
          ? 'slower'
          : 'same';

    if (guessDir === expectedDir && guessSpeed === expectedSpeed) {
      setQuizFeedback('ok');
      setIsSpinning(true);
      playSuccess();
      onAwardXp(30);
    } else {
      setQuizFeedback('err');
      playError();
    }
  };

  const handleNextQuiz = () => {
    playClick();
    setActiveQuiz(generateGearQuiz(createFreshSeedCode()));
    setQuizCount((c) => c + 1);
    setGuessDir(null);
    setGuessSpeed(null);
    setQuizFeedback('idle');
    setIsSpinning(false);
  };

  const handleTestBuilder = () => {
    playClick();
    setIsSpinning(true);
    const dirOk = lastGear.direction === activeMission.targetDir;
    const ratioOk = Math.abs(totalRatio - activeMission.targetRatio) < 0.02;
    if (dirOk && ratioOk) {
      setBuilderFeedback('ok');
      playSuccess();
      onAwardXp(40);
    } else {
      setBuilderFeedback('err');
      playError();
    }
  };

  const handleNextMission = () => {
    playClick();
    const next = generateGearBuilderMission(createFreshSeedCode());
    setActiveMission(next);
    setMissionCount((c) => c + 1);
    setBuilderMotorDir(next.motorDir);
    setBuilderFeedback('idle');
  };

  const handleAddBuilderGear = () => {
    if (builderGears.length >= 4) return;
    playClick();
    setBuilderGears((prev) => [...prev, {id: `b_g${prev.length + 1}`, teeth: 16}]);
    setBuilderFeedback('idle');
  };

  const handleRemoveBuilderGear = () => {
    if (builderGears.length <= 2) return;
    playClick();
    setBuilderGears((prev) => prev.slice(0, -1));
    setBuilderFeedback('idle');
  };

  const handleChangeTeeth = (idx: number, teeth: number) => {
    playClick();
    setBuilderGears((prev) => prev.map((g, i) => (i === idx ? {...g, teeth} : g)));
    setBuilderFeedback('idle');
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Top Zone: Precision Drafting SVG Stage */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('challenge');
                setIsSpinning(false);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'challenge'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.gears.modeChallenge}
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setMode('builder');
                setIsSpinning(true);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'builder'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.gears.modeBuilder}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              playClick();
              setIsSpinning((s) => !s);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            {isSpinning ? (
              <>
                <Square className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
                {t.common.stopMechanism}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                {t.common.testMechanism}
              </>
            )}
          </button>
        </div>

        {/* Dark Instrument SVG Stage */}
        <div className="drafting-stage relative flex min-h-[290px] items-center justify-center overflow-hidden rounded-xl border border-slate-800 p-3">
          <svg
            viewBox={svgViewBox}
            className="h-[270px] w-full select-none"
            role="img"
            aria-label={t.tabs.gears}
          >
            <line
              x1={firstGear.cx}
              y1={0}
              x2={lastGear.cx}
              y2={0}
              stroke="#334155"
              strokeWidth={6}
              strokeLinecap="round"
            />

            {kinematics.map((g, idx) => {
              const isDriver = idx === 0;
              const isOutput = idx === kinematics.length - 1;
              const fill = isDriver ? '#1E3A8A' : isOutput ? '#78350F' : '#1E293B';
              const stroke = isDriver ? '#38BDF8' : isOutput ? '#F59E0B' : '#94A3B8';
              const gearPath = createGearPath(g.teeth);
              const rot = (anglesDeg[idx] ?? 0) + g.phaseOffsetDeg;

              return (
                <g key={`${g.id}-${idx}`} transform={`translate(${g.cx}, ${g.cy})`}>
                  <g transform={`rotate(${rot.toFixed(2)})`}>
                    <path d={gearPath} fill={fill} stroke={stroke} strokeWidth={2} />
                    <circle
                      cx={0}
                      cy={0}
                      r={Math.max(5, g.pitchRadius * 0.28)}
                      fill="#0B1220"
                      stroke={stroke}
                      strokeWidth={1.8}
                    />
                    <line
                      x1={0}
                      y1={0}
                      x2={g.pitchRadius * 0.72}
                      y2={0}
                      stroke={stroke}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <circle cx={g.pitchRadius * 0.65} cy={0} r={3.5} fill={stroke} />
                  </g>

                  <circle cx={0} cy={0} r={4} fill="#F8FAFC" />

                  {(isSpinning || mode === 'builder' || isDriver || quizFeedback !== 'idle') && (
                    <text
                      x={0}
                      y={-g.pitchRadius - 10}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill={stroke}
                    >
                      {g.direction === 'cw' ? '↻ CW' : '↺ CCW'}
                    </text>
                  )}

                  <text
                    x={0}
                    y={g.pitchRadius + 17}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#E2E8F0"
                  >
                    {g.teeth}Z
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Live Telemetry Bar */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.gears.driverMotor}</p>
            <p className="font-mono-tabular text-sm font-bold text-[#1D4ED8]">
              {firstGear.teeth}Z · {firstGear.rpm} RPM
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.gears.outputGear}</p>
            <p className="font-mono-tabular text-sm font-bold text-[#EA580C]">
              {lastGear.teeth}Z ·{' '}
              {mode === 'challenge' && quizFeedback === 'idle' ? '???' : `${lastGear.rpm.toFixed(1)} RPM`}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.gears.ratioLabel}</p>
            <p className="font-mono-tabular text-sm font-bold text-slate-900">{totalRatio}:1</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">{t.gears.directionLabel}</p>
            <p className="font-mono-tabular text-sm font-bold text-slate-900">
              {mode === 'challenge' && quizFeedback === 'idle'
                ? '???'
                : lastGear.direction === 'cw'
                  ? '↻ CW'
                  : '↺ CCW'}
            </p>
          </div>
        </div>
      </div>

      {/* Right / Bottom Zone: Controls & Challenges */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 lg:col-span-5">
        {mode === 'challenge' ? (
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{t.gears.modeChallenge}</span>
                <span className="font-mono-tabular">
                  #{quizCount} · {activeQuiz.seed}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-sm font-bold text-slate-900">{t.gears.questionDir}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {(['cw', 'ccw'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => {
                        playClick();
                        setGuessDir(dir);
                        setQuizFeedback('idle');
                      }}
                      className={`h-11 rounded-lg border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                        guessDir === dir
                          ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {dir === 'cw' ? `↻ ${t.common.cw}` : `↺ ${t.common.ccw}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-bold text-slate-900">{t.gears.questionSpeed}</p>
                <div className="mt-2.5 grid grid-cols-1 gap-2">
                  {(
                    [
                      {id: 'faster', label: t.common.faster},
                      {id: 'same', label: t.common.sameSpeed},
                      {id: 'slower', label: t.common.slower},
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setGuessSpeed(opt.id);
                        setQuizFeedback('idle');
                      }}
                      className={`h-10 rounded-lg border px-3 text-start text-xs font-semibold transition-colors cursor-pointer ${
                        guessSpeed === opt.id
                          ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              {quizFeedback !== 'idle' && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs font-medium ${
                    quizFeedback === 'ok'
                      ? 'border-emerald-200 bg-emerald-50 text-[#047857]'
                      : 'border-red-200 bg-red-50 text-[#DC2626]'
                  }`}
                >
                  {quizFeedback === 'ok' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{quizFeedback === 'ok' ? t.common.correct : t.common.tryAgain}</span>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={!guessDir || !guessSpeed}
                  onClick={handleCheckQuiz}
                  className="h-11 flex-1 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {t.common.checkAnswer}
                </button>
                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.nextChallenge}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{t.gears.modeBuilder}</span>
                <span className="font-mono-tabular">
                  #{missionCount} · {activeMission.seed}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50/70 p-3.5">
                <p className="text-xs font-medium text-slate-700">{t.gears.builderGoalPrefix}</p>
                <p className="mt-1 font-mono-tabular text-sm font-bold text-slate-900">
                  {activeMission.targetDir === 'cw' ? `↻ ${t.common.cw}` : `↺ ${t.common.ccw}`} ·{' '}
                  {t.gears.ratioLabel}: {activeMission.targetRatio}:1
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{t.gears.motorDirControl}:</span>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setBuilderMotorDir((d) => (d === 'cw' ? 'ccw' : 'cw'));
                      setBuilderFeedback('idle');
                    }}
                    className="h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    {builderMotorDir === 'cw' ? '↻ CW' : '↺ CCW'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={builderGears.length <= 2}
                    onClick={handleRemoveBuilderGear}
                    aria-label={t.gears.removeGear}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="font-mono-tabular px-2 text-xs font-bold text-slate-800">
                    {builderGears.length}
                  </span>
                  <button
                    type="button"
                    disabled={builderGears.length >= 4}
                    onClick={handleAddBuilderGear}
                    aria-label={t.gears.addGear}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {builderGears.map((gear, idx) => (
                  <div
                    key={gear.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-slate-800">
                      {idx === 0
                        ? t.gears.driverMotor
                        : idx === builderGears.length - 1
                          ? t.gears.outputGear
                          : `${t.gears.gearLabel} ${idx + 1}`}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {TOOTH_OPTIONS.map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => handleChangeTeeth(idx, z)}
                          className={`font-mono-tabular h-8 rounded px-2 text-xs font-semibold transition-colors cursor-pointer ${
                            gear.teeth === z
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              {builderFeedback !== 'idle' && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs font-medium ${
                    builderFeedback === 'ok'
                      ? 'border-emerald-200 bg-emerald-50 text-[#047857]'
                      : 'border-red-200 bg-red-50 text-[#DC2626]'
                  }`}
                >
                  {builderFeedback === 'ok' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{builderFeedback === 'ok' ? t.gears.goalMet : t.gears.goalNotMet}</span>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleTestBuilder}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#EA580C] px-4 text-xs font-semibold text-white hover:bg-orange-700 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.common.testMechanism}
                </button>
                <button
                  type="button"
                  onClick={handleNextMission}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  {t.common.nextChallenge}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
