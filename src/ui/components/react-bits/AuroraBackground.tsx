import React from 'react';
import { useReducedMotion } from './useReducedMotion';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = '',
  showRadialGradient = true,
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <div className={`relative flex flex-col items-center justify-start overflow-hidden bg-stone-50 ${className}`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`
            absolute -inset-[10px] opacity-40 blur-[40px] will-change-transform
            ${prefersReduced ? '' : 'animate-aurora'}
            bg-gradient-to-r from-amber-200/40 via-rose-200/30 to-sky-200/30
          `}
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 20% 20%, rgba(251, 146, 60, 0.25), transparent 50%),
              radial-gradient(ellipse at 80% 30%, rgba(244, 63, 94, 0.18), transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(56, 189, 248, 0.18), transparent 50%)
            `,
          }}
        />
        {showRadialGradient && (
          <div className="absolute inset-0 bg-stone-50/60 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        )}
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};
