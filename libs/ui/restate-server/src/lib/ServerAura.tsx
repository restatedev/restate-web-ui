import { useEffect, type RefObject } from 'react';
import type { FerrofluidStatus } from './ferrofluid-engine';
import { tv } from '@restate/util-styles';

type AuraIntensity = 'subtle' | 'prominent';

const PARTICLES = [
  { s: 14, x: -100, y: -80 },
  { s: 10, x: 95, y: -70 },
  { s: 8, x: 80, y: 90 },
  { s: 12, x: -90, y: 75 },
  { s: 7, x: -35, y: -105 },
  { s: 10, x: 110, y: 15 },
];

const STATUS_PARTICLE_COLOR: Record<FerrofluidStatus, string> = {
  idle: 'color-mix(in oklab, var(--background-color-accent-vivid) 60%, transparent)',
  active:
    'color-mix(in oklab, var(--background-color-accent-vivid) 70%, transparent)',
  pause:
    'color-mix(in oklab, var(--background-color-accent-vivid) 40%, transparent)',
  warning:
    'color-mix(in oklab, var(--background-color-warning-vivid) 70%, transparent)',
  danger:
    'color-mix(in oklab, var(--background-color-danger-vivid) 70%, transparent)',
};

const INTENSITY_CONFIG: Record<
  AuraIntensity,
  {
    particleCount: number;
    durationScale: number;
    delaySpread: number;
    opacity: number;
  }
> = {
  subtle: {
    particleCount: 3,
    durationScale: 1.8,
    delaySpread: 2.5,
    opacity: 0.5,
  },
  prominent: {
    particleCount: 6,
    durationScale: 1,
    delaySpread: 1,
    opacity: 0.8,
  },
};

export function useServerAura(
  containerRef: RefObject<HTMLDivElement | null>,
  status: FerrofluidStatus,
  intensity: AuraIntensity = 'prominent',
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const color = STATUS_PARTICLE_COLOR[status] ?? STATUS_PARTICLE_COLOR.idle;
    const config = INTENSITY_CONFIG[intensity];
    const particles = PARTICLES.slice(0, config.particleCount);
    const dots: HTMLDivElement[] = [];

    particles.forEach(({ s, x, y }, i) => {
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:${color};top:50%;left:50%;margin-top:${-s / 2}px;margin-left:${-s / 2}px;pointer-events:none;`;
      el.appendChild(dot);
      dots.push(dot);

      const dur = (3 + i * 0.5) * config.durationScale;
      const delay = i * config.delaySpread;

      dot.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: config.opacity },
          {
            transform: `translate(${x * 0.8}px,${y * 0.8}px) scale(0.5)`,
            opacity: config.opacity * 0.5,
            offset: 0.7,
          },
          { transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 },
        ],
        {
          duration: dur * 1000,
          delay: delay * 1000,
          iterations: Infinity,
          easing: 'ease-out',
        },
      );
    });

    return () => {
      for (const dot of dots) dot.remove();
    };
  }, [containerRef, status, intensity]);
}

const ringStyle = tv({
  base: 'absolute top-1/2 left-1/2 h-28 w-28 -translate-1/2 rounded-full border',
  variants: {
    status: {
      idle: 'border-accent/30',
      active: 'border-accent/30',
      pause: 'border-accent/20',
      warning: 'border-pending/30',
      danger: 'border-danger/30',
    },
  },
  defaultVariants: { status: 'idle' },
});

export function ServerRings({
  status,
  intensity = 'prominent',
}: {
  status: FerrofluidStatus;
  intensity?: AuraIntensity;
}) {
  const speed = intensity === 'subtle' ? 5 : 3;
  const gap = intensity === 'subtle' ? speed / 2 : speed / 3;
  return (
    <>
      <div
        className={ringStyle({ status })}
        style={{ animation: `ripple ${speed}s ease-out infinite` }}
      />
      <div
        className={ringStyle({ status })}
        style={{ animation: `ripple ${speed}s ease-out ${gap}s infinite` }}
      />
      {intensity === 'prominent' && (
        <div
          className={ringStyle({ status })}
          style={{
            animation: `ripple ${speed}s ease-out ${gap * 2}s infinite`,
          }}
        />
      )}
    </>
  );
}
