import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DateTooltip } from '@restate/ui/tooltip';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useTimelineEngineContext } from './TimelineEngineContext';

const FADE_DURATION = 100;
const intervalStyles = tv({
  base: 'pointer-events-none absolute top-0 bottom-0 transform border-r border-dotted border-black/10 pt-0 pr-0.5 text-right font-sans text-2xs text-gray-500',
  variants: {
    animate: {
      true: 'transition-[width,left,right] duration-300 ease-out',
      false: '',
    },
  },
});

const tickContainerStyles = tv({
  base: 'pointer-events-none relative mt-[calc(3rem+2px)] h-[calc(100%-3rem-2px)] w-full overflow-hidden rounded-r-2xl',
});

const backgroundStyles = tv({
  base: 'pointer-events-none absolute top-0 bottom-0',
  variants: {
    isEven: {
      true: 'bg-gray-400/5',
      false: '',
    },
    trailing: {
      false: 'transform',
      true: '',
    },
    animate: {
      true: 'transition-[width,left,right] duration-300 ease-out',
      false: '',
    },
  },
  defaultVariants: {
    trailing: false,
    animate: false,
  },
});

const startDateTimeStyles = tv({
  base: 'pointer-events-none relative h-full',
});

const nowLabelStyles = tv({
  base: 'absolute z-4 mt-0.5 rounded-sm border border-white bg-zinc-500 px-1 text-2xs text-white',
  variants: {
    side: {
      right: 'left-px',
      left: 'left-px -translate-x-full',
    },
  },
});

export function Units({
  className,
  style,
  start,
  end,
  dataUpdatedAt,
  cancelEvent,
}: {
  className?: string;
  style?: CSSProperties;
  start: number;
  end: number;
  dataUpdatedAt: number;
  cancelEvent?: JournalEntryV2;
}) {
  const duration = end - start;
  const engine = useTimelineEngineContext();
  const targetInterval = engine.tickInterval;

  const tickContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [renderedInterval, setRenderedInterval] = useState(targetInterval);

  useEffect(() => {
    if (targetInterval === renderedInterval) return;

    if (engine.mode === 'live-follow') {
      animationRef.current?.cancel();
      setRenderedInterval(targetInterval);
      return;
    }

    const el = tickContainerRef.current;
    if (!el) return;

    animationRef.current?.cancel();

    const fadeOut = el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_DURATION,
      easing: 'ease-out',
    });

    fadeOut.onfinish = () => {
      setRenderedInterval(targetInterval);
      animationRef.current = el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: FADE_DURATION,
        easing: 'ease-in',
      });
    };

    animationRef.current = fadeOut;
    return () => animationRef.current?.cancel();
  }, [targetInterval, renderedInterval, engine.mode]);

  const unit = renderedInterval;
  const shouldAnimateTickLayout = engine.mode === 'live-follow';

  const relViewportLeft = engine.viewportStart - start;
  const relViewportRight = engine.viewportEnd - start;
  const nowMs = Math.max(start, Math.min(dataUpdatedAt, end));
  const shouldShowNow = dataUpdatedAt <= end;
  const nowLabelSide =
    nowMs > (engine.viewportStart + engine.viewportEnd) / 2 ? 'left' : 'right';

  const ticks: number[] = [];
  if (duration > 0 && unit > 0) {
    const firstTick = Math.max(
      unit,
      Math.ceil(Math.max(0, relViewportLeft - unit) / unit) * unit,
    );
    const lastTick = Math.min(duration, relViewportRight + unit);
    for (let t = firstTick; t <= lastTick; t += unit) {
      ticks.push(t);
    }
  }

  return (
    <div className={className} style={style}>
      <div className="pointer-events-none absolute top-0 bottom-0 left-2 border-l border-dashed border-gray-500/40" />
      {cancelEvent && (
        <div className="pointer-events-none absolute top-[calc(3rem+2px)] right-0 bottom-0 left-0 overflow-hidden px-2 transition-all duration-300">
          <div
            className="h-full w-full rounded-br-2xl border-l-2 border-black/8 mix-blend-multiply transition-all duration-300 [background:repeating-linear-gradient(-45deg,--theme(--color-black/0.05),--theme(--color-black/0.05)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)_fixed]"
            style={{
              marginLeft: `calc(${
                ((new Date(String(cancelEvent?.start)).getTime() - start) /
                  duration) *
                100
              }% - 1px)`,
            }}
          />
        </div>
      )}
      {shouldShowNow && (
        <div
          style={{
            left: `calc(${((nowMs - start) / duration) * 100}% - 2px - 0.5rem)`,
          }}
          className="absolute top-[calc(3rem+2px)] right-0 bottom-0 rounded-r-2xl border-l-2 border-white/80 font-sans text-2xs text-gray-500 transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-r-2xl mix-blend-screen [background:repeating-linear-gradient(-45deg,--theme(--color-white/.6),--theme(--color-white/.6)_2px,--theme(--color-white/0)_2px,--theme(--color-white/0)_4px)]" />
          <div className={nowLabelStyles({ side: nowLabelSide })}>Now</div>
        </div>
      )}
      <div className="h-full">
        <div ref={tickContainerRef} className={tickContainerStyles()}>
          <div className="absolute inset-y-0 left-0 w-2" />
          {ticks.map((tickMs, i) => {
            const leftPercent = (tickMs / duration) * 100;
            const globalIndex = Math.round(tickMs / unit);
            const prevTickMs = i === 0 ? ticks[0]! - unit : ticks[i - 1]!;
            const prevPercent = Math.max(0, (prevTickMs / duration) * 100);
            const isEven = globalIndex % 2 === 0;
            return (
              <div key={tickMs}>
                <div
                  className={backgroundStyles({
                    isEven,
                    animate: shouldAnimateTickLayout,
                  })}
                  style={{
                    left: `calc(${prevPercent}% + 0.5rem)`,
                    width: `${leftPercent - prevPercent}%`,
                  }}
                />
                <div
                  className={intervalStyles({
                    animate: shouldAnimateTickLayout,
                  })}
                  style={{
                    left: `calc(0.5rem + ${prevPercent}%)`,
                    width: `${leftPercent - prevPercent}%`,
                  }}
                >
                  +{formatDurations(getDuration(tickMs))}
                </div>
              </div>
            );
          })}
          {ticks.length > 0 && (
            <div
              className={backgroundStyles({
                isEven:
                  (Math.round(ticks[ticks.length - 1]! / unit) + 1) % 2 === 0,
                trailing: true,
                animate: shouldAnimateTickLayout,
              })}
              style={{
                left: `calc(${(ticks[ticks.length - 1]! / duration) * 100}% + 0.5rem)`,
                right: 0,
              }}
            />
          )}
          <div className="absolute inset-y-0 right-0 w-2" />
        </div>
      </div>
    </div>
  );
}

export function StartDateTimeUnit({
  className,
  start,
}: {
  className?: string;
  start: number;
}) {
  return (
    <div className={startDateTimeStyles({ className })}>
      <div className="absolute -top-8 bottom-0 left-2 border-l border-dashed border-gray-500/40 font-sans text-2xs text-gray-500">
        <div className="pointer-events-auto ml-1 flex w-28 -translate-y-1 flex-col justify-start text-left">
          <DateTooltip date={new Date(start)} title="">
            {new Date(start).toLocaleDateString('en', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </DateTooltip>
          <DateTooltip date={new Date(start)} title="">
            {new Date(start).toLocaleTimeString('en', {
              timeZoneName: 'short',
            })}
          </DateTooltip>
        </div>
      </div>
    </div>
  );
}
