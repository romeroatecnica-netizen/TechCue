import {
  Check,
  CheckCircle2,
  Copy,
  Link2,
  Play,
  RefreshCw,
  Share2,
  Timer,
  Trophy,
  XCircle,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import type {LocaleCode} from '../config/seo';
import type {TranslationDict} from '../i18n/types';
import {
  buildDuelShareUrl,
  createFreshSeedCode,
  generateDynamicQuestionDeck,
  type DuelPayload,
  type DynamicQuestion,
} from '../utils/challengeEngine';
import {playClick, playError, playSuccess} from '../utils/sound';
import {DynamicQuestionSvg} from './DynamicQuestionSvg';

interface DuelArenaProps {
  t: TranslationDict;
  lang: LocaleCode;
  activeProfileName: string;
  incomingDuel: DuelPayload | null;
  onResetIncomingDuel: () => void;
  onCompleteDuel: (xp: number, won: boolean) => void;
}

const DUEL_ROUNDS = 5;

export function DuelArena({
  t,
  lang,
  activeProfileName,
  incomingDuel,
  onResetIncomingDuel,
  onCompleteDuel,
}: DuelArenaProps) {
  const [seed, setSeed] = useState<string>(() => incomingDuel?.seed ?? createFreshSeedCode());
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'summary'>(() =>
    incomingDuel ? 'playing' : 'lobby'
  );
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundStartMs, setRoundStartMs] = useState<number>(() => Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'open' | 'score' | null>(null);

  // Sync if an incoming duel URL is loaded
  useEffect(() => {
    if (incomingDuel) {
      setSeed(incomingDuel.seed);
      setPhase('playing');
      setRoundIdx(0);
      setScore(0);
      setCorrectCount(0);
      setElapsedSec(0);
      setSelectedKey(null);
      setRoundStartMs(Date.now());
    }
  }, [incomingDuel]);

  // Live timer while playing
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const roundsCount = incomingDuel?.rounds ?? DUEL_ROUNDS;
  const deck = useMemo(() => generateDynamicQuestionDeck(seed, roundsCount), [seed, roundsCount]);
  const currentQ = deck[roundIdx];

  const getOptionLabel = (q: DynamicQuestion, labelKey: DynamicQuestion['options'][number]['labelKey']) => {
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

  const handleRollNewSeed = () => {
    playClick();
    onResetIncomingDuel();
    setSeed(createFreshSeedCode());
    setPhase('lobby');
    setRoundIdx(0);
    setScore(0);
    setCorrectCount(0);
    setElapsedSec(0);
    setSelectedKey(null);
    setCopiedType(null);
  };

  const handleStartDuel = () => {
    playClick();
    setPhase('playing');
    setRoundIdx(0);
    setScore(0);
    setCorrectCount(0);
    setElapsedSec(0);
    setSelectedKey(null);
    setRoundStartMs(Date.now());
  };

  const handleAnswer = (key: string) => {
    if (selectedKey !== null) return;
    playClick();
    setSelectedKey(key);
    const isRight = key === currentQ.answerKey;
    const secTaken = Math.max(0, (Date.now() - roundStartMs) / 1000);
    const speedBonus = isRight ? Math.max(0, Math.round(40 - secTaken * 3)) : 0;
    const gained = isRight ? 100 + speedBonus : 0;

    if (isRight) {
      setScore((s) => s + gained);
      setCorrectCount((c) => c + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleNextRound = () => {
    playClick();
    if (roundIdx + 1 >= deck.length) {
      setPhase('summary');
      const hasTarget = incomingDuel?.challengerScore !== undefined;
      const won = !hasTarget || score > (incomingDuel?.challengerScore ?? 0);
      onCompleteDuel(Math.max(25, Math.round(score / 4)), won);
    } else {
      setRoundIdx((i) => i + 1);
      setSelectedKey(null);
      setRoundStartMs(Date.now());
    }
  };

  const copyShareUrl = async (withScore: boolean) => {
    playClick();
    const payload: DuelPayload = withScore
      ? {
          seed,
          rounds: roundsCount,
          challengerName: activeProfileName,
          challengerScore: score,
          challengerTimeSec: Math.max(1, elapsedSec),
        }
      : {
          seed,
          rounds: roundsCount,
          challengerName: activeProfileName,
        };
    const link = buildDuelShareUrl(payload, lang);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedType(withScore ? 'score' : 'open');
      window.setTimeout(() => setCopiedType(null), 2600);
    } catch {
      // Fallback hidden input copy
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      setCopiedType(withScore ? 'score' : 'open');
      window.setTimeout(() => setCopiedType(null), 2600);
    }
  };

  const handleNativeShare = async () => {
    const link = buildDuelShareUrl(
      {
        seed,
        rounds: roundsCount,
        challengerName: activeProfileName,
        challengerScore: phase === 'summary' ? score : undefined,
        challengerTimeSec: phase === 'summary' ? Math.max(1, elapsedSec) : undefined,
      },
      lang
    );
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TechCue',
          text: t.duel.title,
          url: link,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      await copyShareUrl(phase === 'summary');
    }
  };

  const hasChallengerScore = incomingDuel?.challengerScore !== undefined;
  const challengerScore = incomingDuel?.challengerScore ?? 0;
  const duelOutcome = !hasChallengerScore
    ? null
    : score > challengerScore
      ? 'win'
      : score === challengerScore
        ? 'tie'
        : 'lose';

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-5 sm:p-6">
      {/* Top Duel Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#EA580C]">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{incomingDuel ? t.duel.incomingBanner : t.tabs.duel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-700">
              {t.duel.seedLabel}: {seed}
            </span>
          </div>
          <h2 className="font-display mt-1 text-xl font-bold text-slate-900">{t.duel.title}</h2>
          <p className="mt-0.5 text-xs text-slate-600">{t.duel.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleRollNewSeed}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#1D4ED8]" aria-hidden="true" />
          {t.duel.newSeedBtn}
        </button>
      </div>

      {/* Incoming challenger target bar */}
      {incomingDuel && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50/70 px-4 py-2.5 text-xs">
          <div className="font-semibold text-slate-900">
            {t.duel.challengerResult}: <span className="font-bold">{incomingDuel.challengerName ?? 'Player 1'}</span>
          </div>
          {hasChallengerScore && (
            <div className="font-mono-tabular font-bold text-[#EA580C]">
              {t.duel.beatScorePrompt}: {challengerScore} {t.duel.pointsUnit} (
              {incomingDuel.challengerTimeSec ?? 0}
              {t.duel.secondsUnit})
            </div>
          )}
        </div>
      )}

      {/* PHASE 1: LOBBY */}
      {phase === 'lobby' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="drafting-stage flex flex-col justify-between rounded-xl border border-slate-800 p-5 text-white lg:col-span-7">
            <div>
              <p className="font-mono-tabular text-xs font-semibold text-sky-400">
                {t.duel.seedLabel} · {seed}
              </p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {deck.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-center"
                  >
                    <p className="font-mono-tabular text-[11px] font-bold text-slate-400">0{idx + 1}</p>
                    <p className="mt-1 text-xs font-bold capitalize text-amber-400">{item.category}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartDuel}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#EA580C] px-5 text-xs font-bold text-white hover:bg-orange-700 cursor-pointer whitespace-nowrap"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {t.duel.playAndChallenge}
              </button>
              <button
                type="button"
                onClick={() => copyShareUrl(false)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                {copiedType === 'open' ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 text-sky-400" aria-hidden="true" />
                )}
                {copiedType === 'open' ? t.duel.copied : t.duel.copyOpenLink}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">{t.duel.heroBtn}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.duel.subtitle}</p>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs font-medium text-slate-600">
              <span className="font-mono-tabular font-bold text-slate-900">{roundsCount}</span>
              <span>·</span>
              <span>{t.tabs.gears}</span>
              <span>·</span>
              <span>{t.tabs.pulleys}</span>
              <span>·</span>
              <span>{t.tabs.circuits}</span>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: PLAYING */}
      {phase === 'playing' && currentQ && (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-7">
            <div className="mb-3 flex items-center justify-between font-mono-tabular text-xs font-bold">
              <span className="text-slate-800">
                {t.duel.roundLabel} {roundIdx + 1} / {deck.length}
              </span>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1 text-[#EA580C]">
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  {elapsedSec}
                  {t.duel.secondsUnit}
                </span>
                <span className="text-[#1D4ED8]">
                  {score} {t.duel.pointsUnit}
                </span>
              </div>
            </div>

            <div className="drafting-stage flex min-h-[260px] items-center justify-center rounded-xl border border-slate-800 p-3">
              <DynamicQuestionSvg question={currentQ} revealed={selectedKey !== null} t={t} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
            <div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm font-bold text-slate-900">
                {currentQ.category === 'lever' &&
                  `${t.blitz.leverBalanceLabel}: ${currentQ.leftN}N × ${currentQ.leftDist}m vs ${currentQ.rightN}N × ${currentQ.rightDist}m`}
                {currentQ.category === 'gear' && t.gears.questionDir}
                {currentQ.category === 'pulley' &&
                  `${t.pulleys.effortForce}: ${currentQ.pulleyLoadN} N · ${t.pulleys.supportingRopes} = ${currentQ.pulleyRopes}`}
                {currentQ.category === 'circuit' &&
                  (currentQ.circuitSeriesOpen
                    ? `${t.circuits.boardSeries} (${t.circuits.switchLabel}: ${t.circuits.openState})`
                    : `${t.circuits.boardParallel} (1 Branch ${t.circuits.openState})`)}
              </div>

              <div className="mt-4 space-y-2.5">
                {currentQ.options.map((opt) => {
                  const isPicked = selectedKey === opt.key;
                  const isRight = opt.key === currentQ.answerKey;
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
                      onClick={() => handleAnswer(opt.key)}
                      className={`flex h-12 w-full items-center justify-between rounded-lg border px-4 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span>{getOptionLabel(currentQ, opt.labelKey)}</span>
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

            {selectedKey !== null && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={handleNextRound}
                  className="h-11 w-full rounded-lg bg-[#1D4ED8] px-4 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer"
                >
                  {roundIdx + 1 >= deck.length ? t.blitz.roundComplete : t.common.nextChallenge}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 3: SUMMARY & SHAREABLE SCORE LINK */}
      {phase === 'summary' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <Trophy
                className={`h-9 w-9 shrink-0 ${
                  duelOutcome === 'lose' ? 'text-slate-400' : 'text-[#EA580C]'
                }`}
                aria-hidden="true"
              />
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {duelOutcome === 'win'
                    ? t.duel.winResult
                    : duelOutcome === 'tie'
                      ? t.duel.tieResult
                      : duelOutcome === 'lose'
                        ? t.duel.loseResult
                        : t.blitz.roundComplete}
                </h3>
                <p className="font-mono-tabular text-xs text-slate-600">
                  {t.duel.seedLabel}: {seed} · {t.duel.accuracyLabel}: {correctCount}/{deck.length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">{t.duel.yourResult}</p>
                <p className="font-mono-tabular text-base font-extrabold text-[#1D4ED8]">
                  {score} {t.duel.pointsUnit} · {elapsedSec}
                  {t.duel.secondsUnit}
                </p>
              </div>

              {hasChallengerScore && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5">
                  <p className="text-[11px] font-medium text-slate-500">
                    {incomingDuel?.challengerName ?? t.duel.challengerResult}
                  </p>
                  <p className="font-mono-tabular text-base font-extrabold text-[#EA580C]">
                    {challengerScore} {t.duel.pointsUnit} · {incomingDuel?.challengerTimeSec ?? 0}
                    {t.duel.secondsUnit}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => copyShareUrl(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#EA580C] px-5 text-xs font-bold text-white hover:bg-orange-700 cursor-pointer whitespace-nowrap"
            >
              {copiedType === 'score' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copiedType === 'score' ? t.duel.copied : t.duel.copyScoreLink}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Share2 className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
              {t.duel.shareNative}
            </button>

            <button
              type="button"
              onClick={handleRollNewSeed}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t.duel.rematchBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
