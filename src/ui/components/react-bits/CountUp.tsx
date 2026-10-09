import React, { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number; // en milisegundos (default 800ms)
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 800,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const [currentValue, setCurrentValue] = useState<number>(() => {
    if (typeof window === 'undefined') return to;
    return prefersReduced ? to : from;
  });
  const prevToRef = useRef<number>(to);

  useEffect(() => {
    if (prefersReduced) {
      setCurrentValue(to);
      prevToRef.current = to;
      return;
    }

    const startVal = prevToRef.current;
    const endVal = to;
    prevToRef.current = to;

    if (startVal === endVal) {
      setCurrentValue(endVal);
      return;
    }

    let startTimestamp: number | null = null;
    let animId: number;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = startVal + (endVal - startVal) * easedProgress;

      setCurrentValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurrentValue(endVal);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [to, duration, prefersReduced]);

  const formatted = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue).toLocaleString('es-MX');

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
