import {CheckCircle2, Play, RotateCcw, Timer, Trophy, XCircle} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import {
  createFreshSeedCode,
  generateDynamicQuestionDeck,
  getDifficultyXpMultiplier,
  type DifficultyLevel,
  type DynamicQuestion,
} from '../utils/challengeEngine';
import {playClick, playError, playSuccess} from '../utils/sound';
import {DynamicQuestionSvg} from './DynamicQuestionSvg';

interface BlitzModuleProps {
  t: TranslationDict;
  difficulty: DifficultyLevel;
  bestBlitzStreak: number;
  onRecordBlitzResult: (xp: number, streak: number) => void;
}

function getBlitzSeconds(difficulty: DifficultyLevel): number {
  switch (difficulty) {
    case 'easy':
      return 75;
    case 'medium':
      return 60;
    case 'hard':
      return 45;
  }
}

export function BlitzModule({
  t,
  difficulty,
  bestBlitzStreak,
  onRecordBlitzResult,
}: BlitzModuleProps) {
  const [timedMode, setTimedMode] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const [timeLeft, setTimeLeft] = useState(() => getBlitzSeconds(difficulty));
  const [deck, setDeck] = useState<DynamicQuestion[]>(() =>
    generateDynamicQuestionDeck(createFreshSeedCode(), 12, difficulty)
  );
  const [deckIdx, setDeckIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [roundDone, setRoundDone] = useState(false);

  useEffect(() => {
    setDeck(generateDynamicQuestionDeck(createFreshSeedCode(), 12, difficulty));
    setDeckIdx(0);
    setSelectedKey(null);
    setRoundDone(false);
    setTimeLeft(getBlitzSeconds(difficulty));
  }, [difficulty]);

  const q = deck[deckIdx];

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
  const diffMult = getDifficultyXpMultiplier(difficulty);

  const getOptionLabel = (labelKey: DynamicQuestion['options'][number]['labelKey']) => {
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
      case 'full':
        return `${q.pulleyLoadN ?? 200} N (MA 1x)`;
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
      const gained = Math.round(20 * multiplier * diffMult);
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
    if (deckIdx + 1 >= deck.length) {
      setDeck(generateDynamicQuestionDeck(createFreshSeedCode(), 12, difficulty));
      setDeckIdx(0);
    } else {
      setDeckIdx((prev) => prev + 1);
    }
  };

  const handleStartTimed = () => {
    playClick();
    setDeck(generateDynamicQuestionDeck(createFreshSeedCode(), 12, difficulty));
    setDeckIdx(0);
    setTimedMode(true);
    setTimeLeft(getBlitzSeconds(difficulty));
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left / Top Zone: Dynamic SVG Visual Stage */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={handleSwitchRelaxed}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                !timedMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.blitz.relaxedMode}
            </button>
            <button
              type="button"
              onClick={handleStartTimed}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                timedMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.blitz.timedMode} ({getBlitzSeconds(difficulty)}s)
            </button>
          </div>

          <div className="flex items-center gap-4 font-mono-tabular text-xs font-bold">
            {timedMode && (
              <span className="inline-flex items-center gap-1 text-[#DC2626]">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {timeLeft}s
              </span>
            )}
            <span className="text-[#1D4ED8]">
              {t.blitz.scoreLabel}: {score}
            </span>
            <span className="text-[#EA580C]">
              {t.blitz.streakLabel}: {streak} ({multiplier}x)
            </span>
          </div>
        </div>

        <div className="drafting-stage flex min-h-[280px] items-center justify-center rounded-xl border border-slate-800 p-3">
          <DynamicQuestionSvg question={q} revealed={selectedKey !== null} t={t} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
            {t.blitz.bestStreakLabel}:{' '}
            <span className="font-mono-tabular text-slate-900">{bestBlitzStreak}</span>
          </span>
          <span className="font-mono-tabular">
            {deckIdx + 1} / {deck.length}
          </span>
        </div>
      </div>

      {/* Right / Bottom Zone: Question Card */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 lg:col-span-5">
        {roundDone ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <Trophy className="h-10 w-10 text-[#EA580C]" aria-hidden="true" />
            <h3 className="font-display mt-3 text-xl font-bold text-slate-900">{t.blitz.roundComplete}</h3>
            <p className="mt-2 font-mono-tabular text-2xl font-extrabold text-[#1D4ED8]">
              {score} {t.blitz.scoreLabel}
            </p>
            <button
              type="button"
              onClick={handleStartTimed}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#EA580C] px-5 text-xs font-semibold text-white hover:bg-orange-700 cursor-pointer"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t.blitz.playAgain}
            </button>
          </div>
        ) : (
          <>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">{t.blitz.title}</h3>
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
                      style = 'border-[#047857] bg-emerald-50 text-[#047857]';
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
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
