import { useEffect, useRef } from 'react';
import { RestateServer } from '@restate/ui/restate-server';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from '@restate/features/service';
import { StatusArcEcharts } from '@restate/features/status-chart';
import { TimeRangeToggle } from './TimeRangeToggle';

const PARTICLES = [
  { s: 18, x: -100, y: -80, dur: 4, delay: 0 },
  { s: 14, x: 95, y: -70, dur: 3.5, delay: 0.8 },
  { s: 12, x: 80, y: 90, dur: 4.5, delay: 1.6 },
  { s: 16, x: -90, y: 75, dur: 3.8, delay: 2.2 },
  { s: 10, x: -35, y: -105, dur: 4.2, delay: 0.4 },
  { s: 14, x: 110, y: 15, dur: 3.6, delay: 1.2 },
];

function useParticleEmitter(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dots: HTMLDivElement[] = [];
    for (const { s, x, y, dur, delay } of PARTICLES) {
      const dot = document.createElement('div');
      dot.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;background:rgba(129,140,248,0.8);top:50%;left:50%;margin-top:${-s / 2}px;margin-left:${-s / 2}px;pointer-events:none;z-index:10;`;
      el.appendChild(dot);
      dots.push(dot);

      dot.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 0.8 },
          {
            transform: `translate(${x * 0.8}px,${y * 0.8}px) scale(0.6)`,
            opacity: 0.5,
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
    }

    return () => {
      for (const dot of dots) dot.remove();
    };
  }, [containerRef]);
}

export function NoInvocationsHero({
  serverRef,
  ferrofluidStatus,
  onRefresh,
  firstServiceName,
}: {
  serverRef: React.RefObject<HTMLDivElement | null>;
  ferrofluidStatus: string;
  onRefresh: () => void;
  firstServiceName?: string;
}) {
  const particlesRef = useRef<HTMLDivElement>(null);
  useParticleEmitter(particlesRef);

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div
        ref={particlesRef}
        className="relative -mb-12 h-[280px] w-[280px] overflow-visible"
      >
        <StatusArcEcharts byStatus={[]} />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-1/2 animate-[ripple_3s_ease-out_infinite] rounded-full border border-indigo-300/40" />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-1/2 animate-[ripple_3s_ease-out_infinite_0.8s] rounded-full border border-indigo-300/40" />
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-1/2 animate-[ripple_3s_ease-out_infinite_1.6s] rounded-full border border-indigo-300/40" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            ref={serverRef}
            className="pointer-events-auto z-20 scale-90 animate-[float_6s_ease-in-out_infinite] filter-[drop-shadow(0_4px_12px_rgba(0,0,0,0.08))_drop-shadow(0_1px_3px_rgba(0,0,0,0.06))]"
          >
            <RestateServer status={ferrofluidStatus} onPress={onRefresh} />
          </div>
        </div>
      </div>
      <TimeRangeToggle />
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="text-lg font-medium text-gray-600">All quiet</p>
          <p className="flex items-center gap-1 text-sm text-gray-400">
            {' '}
            <Link
              {...(firstServiceName && {
                href: `?${SERVICE_PLAYGROUND_QUERY_PARAM}=${firstServiceName}`,
              })}
              variant="icon"
              className="flex items-center gap-1.5 rounded-xl text-gray-500/80"
            >
              {/*<Icon name={IconName.Play} className="h-3.5 w-3.5" />*/}
              No invocations yet —{' '}
              <span className="font-medium underline">try sending one</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
