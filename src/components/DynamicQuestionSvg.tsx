import {useEffect, useRef, useState} from 'react';
import type {TranslationDict} from '../i18n/types';
import type {DynamicQuestion} from '../utils/challengeEngine';
import {computeGearTrainKinematics, createGearPath, evaluateLever} from '../utils/physics';

interface DynamicQuestionSvgProps {
  question: DynamicQuestion;
  revealed: boolean;
  t: TranslationDict;
}

export function DynamicQuestionSvg({question, revealed, t}: DynamicQuestionSvgProps) {
  const [gearAngles, setGearAngles] = useState<number[]>([0, 0, 0, 0]);
  const anglesRef = useRef<number[]>([0, 0, 0, 0]);

  const leverEval =
    question.category === 'lever'
      ? evaluateLever(
          question.leftN ?? 20,
          question.leftDist ?? 2,
          question.rightN ?? 20,
          question.rightDist ?? 2
        )
      : null;

  const gearKinematics =
    question.category === 'gear' && question.gearTeeth
      ? computeGearTrainKinematics(
          question.gearTeeth.map((teeth, i) => ({id: `dq_${i}`, teeth})),
          45,
          question.motorDir ?? 'cw'
        )
      : [];

  useEffect(() => {
    if (question.category !== 'gear' || gearKinematics.length === 0) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const next = [...anglesRef.current];
      gearKinematics.forEach((k, idx) => {
        // Spin motor only before reveal, spin full train after reveal
        if (!revealed && idx > 0) return;
        const degPerSec = (k.rpm * 360) / 60;
        const sign = k.direction === 'cw' ? 1 : -1;
        next[idx] = ((next[idx] ?? 0) + sign * degPerSec * dt) % 360;
      });
      anglesRef.current = next;
      setGearAngles(next);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [question, revealed, gearKinematics.length]);

  const leverTilt = revealed && leverEval ? leverEval.tiltDeg : 0;

  if (question.category === 'lever') {
    return (
      <svg
        viewBox="0 0 420 230"
        className="h-[240px] w-full select-none"
        role="img"
        aria-label={t.blitz.leverBalanceLabel}
      >
        {/* Base line */}
        <line x1={30} y1={188} x2={390} y2={188} stroke="#334155" strokeWidth={2} />
        {/* Fulcrum triangle */}
        <polygon points="210,136 184,188 236,188" fill="#475569" stroke="#94A3B8" strokeWidth={1.5} />
        <text x={210} y={208} textAnchor="middle" fontSize="11" fontWeight="700" fill="#94A3B8">
          {t.blitz.fulcrumLabel}
        </text>

        <g
          transform={`translate(210, 132) rotate(${leverTilt})`}
          style={{transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'}}
        >
          <rect x={-165} y={-6} width={330} height={12} rx={3} fill="#F59E0B" />
          {[-3, -2, -1, 1, 2, 3].map((m) => (
            <g key={m} transform={`translate(${m * 48}, 0)`}>
              <line x1={0} y1={-6} x2={0} y2={6} stroke="#0B1220" strokeWidth={2} />
              <text x={0} y={22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#CBD5E1">
                {Math.abs(m)}m
              </text>
            </g>
          ))}

          <g transform={`translate(${-(question.leftDist ?? 1) * 48}, -40)`}>
            <rect x={-25} y={0} width={50} height={34} rx={4} fill="#38BDF8" stroke="#0284C7" strokeWidth={1.5} />
            <text x={0} y={21} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B1220">
              {question.leftN} N
            </text>
          </g>

          <g transform={`translate(${(question.rightDist ?? 1) * 48}, -40)`}>
            <rect x={-25} y={0} width={50} height={34} rx={4} fill="#34D399" stroke="#059669" strokeWidth={1.5} />
            <text x={0} y={21} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B1220">
              {question.rightN} N
            </text>
          </g>
        </g>
      </svg>
    );
  }

  if (question.category === 'gear' && gearKinematics.length > 0) {
    const first = gearKinematics[0];
    const last = gearKinematics[gearKinematics.length - 1];
    const minX = first.cx - first.pitchRadius - 24;
    const maxX = last.cx + last.pitchRadius + 24;
    const width = Math.max(240, maxX - minX);
    const maxR = Math.max(...gearKinematics.map((k) => k.pitchRadius)) + 26;
    const height = Math.max(180, maxR * 2 + 24);
    const viewBox = `${minX.toFixed(1)} ${(-height / 2).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;

    return (
      <svg viewBox={viewBox} className="h-[240px] w-full select-none" role="img" aria-label={t.tabs.gears}>
        <line x1={first.cx} y1={0} x2={last.cx} y2={0} stroke="#334155" strokeWidth={5} strokeLinecap="round" />
        {gearKinematics.map((g, idx) => {
          const isDriver = idx === 0;
          const isOutput = idx === gearKinematics.length - 1;
          const stroke = isDriver ? '#38BDF8' : isOutput ? '#F59E0B' : '#94A3B8';
          const fill = isDriver ? '#1E3A8A' : isOutput ? '#78350F' : '#1E293B';
          const rot = (gearAngles[idx] ?? 0) + g.phaseOffsetDeg;

          return (
            <g key={`${g.id}_${idx}`} transform={`translate(${g.cx}, 0)`}>
              <g transform={`rotate(${rot.toFixed(2)})`}>
                <path d={createGearPath(g.teeth)} fill={fill} stroke={stroke} strokeWidth={2} />
                <circle cx={0} cy={0} r={Math.max(5, g.pitchRadius * 0.28)} fill="#0B1220" stroke={stroke} strokeWidth={1.8} />
                <line x1={0} y1={0} x2={g.pitchRadius * 0.72} y2={0} stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
                <circle cx={g.pitchRadius * 0.65} cy={0} r={3.5} fill={stroke} />
              </g>
              <circle cx={0} cy={0} r={4} fill="#F8FAFC" />
              {(isDriver || revealed) && (
                <text x={0} y={-g.pitchRadius - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill={stroke}>
                  {g.direction === 'cw' ? '↻ CW' : '↺ CCW'}
                </text>
              )}
              <text x={0} y={g.pitchRadius + 18} textAnchor="middle" fontSize="11" fontWeight="700" fill="#CBD5E1">
                {g.teeth}Z
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (question.category === 'pulley') {
    const ropes = question.pulleyRopes ?? 2;
    return (
      <svg viewBox="0 0 340 230" className="h-[240px] w-full select-none" role="img" aria-label={t.tabs.pulleys}>
        <rect x={45} y={18} width={250} height={12} rx={3} fill="#475569" />
        {Array.from({length: ropes}).map((_, idx) => (
          <line
            key={idx}
            x1={130 + idx * 22}
            y1={30}
            x2={130 + idx * 22}
            y2={130}
            stroke="#38BDF8"
            strokeWidth={3}
          />
        ))}
        <circle cx={130 + ((ropes - 1) * 22) / 2} cy={128} r={24} fill="#78350F" stroke="#F59E0B" strokeWidth={3} />
        <circle cx={130 + ((ropes - 1) * 22) / 2} cy={128} r={4.5} fill="#F8FAFC" />
        <rect
          x={130 + ((ropes - 1) * 22) / 2 - 36}
          y={162}
          width={72}
          height={42}
          rx={5}
          fill="#1E293B"
          stroke="#94A3B8"
          strokeWidth={2}
        />
        <text
          x={130 + ((ropes - 1) * 22) / 2}
          y={188}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#F8FAFC"
        >
          {question.pulleyLoadN} N
        </text>
        <text x={265} y={76} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F59E0B">
          {ropes} {ropes === 1 ? 'Rope' : 'Ropes'}
        </text>
      </svg>
    );
  }

  // Circuit question
  const isSeriesOpen = Boolean(question.circuitSeriesOpen);
  return (
    <svg viewBox="0 0 380 220" className="h-[240px] w-full select-none" role="img" aria-label={t.tabs.circuits}>
      <rect
        x={65}
        y={44}
        width={250}
        height={132}
        fill="none"
        stroke={isSeriesOpen ? '#64748B' : '#34D399'}
        strokeWidth={4}
      />
      {!isSeriesOpen && (
        <>
          <line x1={190} y1={44} x2={190} y2={176} stroke="#34D399" strokeWidth={4} />
          <line x1={174} y1={80} x2={206} y2={62} stroke="#F59E0B" strokeWidth={3.5} />
        </>
      )}
      {isSeriesOpen && <line x1={170} y1={44} x2={202} y2={26} stroke="#F59E0B" strokeWidth={3.5} />}
      <rect x={47} y={88} width={36} height={44} rx={5} fill="#1E293B" stroke="#94A3B8" strokeWidth={2} />
      <text x={65} y={114} textAnchor="middle" fontSize="11" fontWeight="700" fill="#34D399">
        9V
      </text>
      <circle
        cx={315}
        cy={110}
        r={18}
        fill={isSeriesOpen ? '#1E293B' : '#FBBF24'}
        stroke={isSeriesOpen ? '#64748B' : '#F59E0B'}
        strokeWidth={2.5}
      />
      <text x={190} y={24} textAnchor="middle" fontSize="11" fontWeight="700" fill="#E2E8F0">
        {isSeriesOpen ? t.circuits.boardSeries : t.circuits.boardParallel}
      </text>
    </svg>
  );
}
