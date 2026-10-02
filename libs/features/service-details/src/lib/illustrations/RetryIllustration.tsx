import { InvocationStatusBadge } from '@restate/features/invocation-ui';
import { Icon, IconName } from '@restate/ui/icons';
import { humanTimeToMs } from '@restate/util/humantime';
import { formatMilliseconds, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { Fragment, type ReactNode } from 'react';
import {
  IllustrationSurfaceRoot,
  explanationItemStyles,
  type IllustrationSurface,
} from './primitives';

const MAX_SHOWN_GAPS = 4;
const MIN_GAP_REM = 1.4;
const MAX_GAP_REM = 5.5;
const VISUAL_GROWTH = 1.35;

const styles = tv({
  slots: {
    strip:
      'flex items-start overflow-hidden text-[0.65625rem] whitespace-nowrap text-gray-500',
    attempt: 'flex w-4 shrink-0 flex-col items-center',
    topRow: 'flex h-4 items-end justify-center pb-[3px]',
    factorTag:
      'inline-flex h-3 items-center rounded-[3px] border border-zinc-300/80 bg-white px-[3px] text-[0.5rem] leading-none font-semibold text-zinc-500',
    markRow: 'flex h-4 w-full items-center justify-center',
    dot: 'h-2.5 w-2.5 rounded-[3px] bg-blue-400/80',
    number: 'h-4 pt-[3px] leading-none font-medium text-zinc-600 tabular-nums',
    gap: 'flex shrink-0 flex-col items-center px-px',
    gapLabel:
      'flex h-4 items-end justify-center gap-1 pb-[3px] leading-none text-zinc-600 tabular-nums',
    gapTag:
      'inline-flex h-3 items-center rounded-[3px] border border-zinc-300/80 bg-white px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-zinc-500 uppercase',
    gapDash: 'w-full border-t border-dashed border-slate-300',
    ellipsis:
      'mt-4 flex h-4 shrink-0 items-center px-1 leading-none text-gray-400',
    terminal:
      'mt-4 ml-1.5 flex h-4 shrink-0 items-center gap-1 leading-none text-gray-500',
    badge: 'h-4 rounded px-[5px] text-[0.53125rem] leading-none',
  },
});

export interface RetryPolicyIllustrationProps {
  maxAttempts?: number | null;
  initialInterval?: string | null;
  maxInterval?: string | null;
  exponentiationFactor?: number | null;
  onMaxAttempts?: 'Pause' | 'Kill' | null;
  surface?: IllustrationSurface;
  className?: string;
}

interface Gap {
  label: string;
  width: number;
  capped: boolean;
}

function labelMinimum(label: string) {
  return Math.max(MIN_GAP_REM, label.length * 0.4 + 0.6);
}

function formatFactor(factor: number) {
  return `×${Number(factor.toFixed(2))}`;
}

function describeGaps({
  initialMs,
  maxMs,
  factor,
  gapCount,
}: {
  initialMs: number;
  maxMs: number;
  factor: number;
  gapCount: number;
}) {
  if (initialMs <= 0) {
    const label = 'default';
    return {
      shown: [{ label, width: labelMinimum(label), capped: false }],
      capped: false,
    };
  }
  const shown: Gap[] = [];
  let capped = false;
  let previousWidth = 0;
  for (let index = 0; index < gapCount; index += 1) {
    const raw = initialMs * Math.pow(factor, index);
    const isCapped = maxMs > 0 && raw >= maxMs;
    const ms = isCapped ? maxMs : raw;
    const label = formatMilliseconds(ms);
    const grown = previousWidth > 0 ? previousWidth * VISUAL_GROWTH : 0;
    const width = Math.min(
      MAX_GAP_REM,
      Math.max(labelMinimum(label), grown, MIN_GAP_REM),
    );
    previousWidth = width;
    shown.push({ label, width, capped: isCapped });
    if (isCapped) {
      capped = true;
      break;
    }
  }
  return { shown, capped };
}

function GapColumn({ gap }: { gap: Gap }) {
  const s = styles();
  return (
    <div className={s.gap()} style={{ width: `${gap.width}rem` }}>
      <span className={s.gapLabel()}>
        {gap.capped && <span className={s.gapTag()}>max</span>}
        {gap.label}
      </span>
      <div className={s.markRow()}>
        <span className={s.gapDash()} />
      </div>
    </div>
  );
}

function AttemptColumn({
  number,
  factor,
}: {
  number: ReactNode;
  factor?: string;
}) {
  const s = styles();
  return (
    <div className={s.attempt()}>
      <div className={s.topRow()}>
        {factor && <span className={s.factorTag()}>{factor}</span>}
      </div>
      <div className={s.markRow()}>
        <span className={s.dot()} />
      </div>
      <span className={s.number()}>{number}</span>
    </div>
  );
}

export function RetryPolicyIllustration({
  maxAttempts,
  initialInterval,
  maxInterval,
  exponentiationFactor,
  onMaxAttempts,
  surface,
  className,
}: RetryPolicyIllustrationProps) {
  const s = styles();
  const initialMs = humanTimeToMs(initialInterval);
  const maxMs = humanTimeToMs(maxInterval);
  const factor = exponentiationFactor ?? 2;
  const hasLimit = typeof maxAttempts === 'number';
  const gapCount = hasLimit
    ? Math.min(MAX_SHOWN_GAPS, Math.max(1, maxAttempts - 1))
    : MAX_SHOWN_GAPS;
  const { shown, capped } = describeGaps({
    initialMs,
    maxMs,
    factor,
    gapCount,
  });
  const showEllipsis = !hasLimit || maxAttempts > shown.length + 1;
  const tail: Gap | undefined =
    showEllipsis && !capped && maxMs > 0 && initialMs > 0
      ? {
          label: formatMilliseconds(maxMs),
          width: Math.min(
            MAX_GAP_REM,
            Math.max(
              labelMinimum(formatMilliseconds(maxMs)) + 1.2,
              shown[shown.length - 1]?.width ?? MIN_GAP_REM,
            ),
          ),
          capped: true,
        }
      : undefined;
  const factorLabel = initialMs > 0 ? formatFactor(factor) : undefined;
  const terminalContent: ReactNode = hasLimit ? (
    <InvocationStatusBadge
      status={onMaxAttempts === 'Kill' ? 'killed' : 'paused'}
      mini
      className={s.badge()}
    />
  ) : (
    <>
      <Icon name={IconName.Retry} className="h-3 w-3 text-gray-400" />
      until it succeeds
    </>
  );

  return (
    <IllustrationSurfaceRoot surface={surface} className={className}>
      <div className={s.strip()} role="img" aria-label="Retry policy timeline">
        {shown.map((gap, index) => (
          <Fragment key={index}>
            <AttemptColumn
              number={index + 1}
              factor={index > 0 && !gap.capped ? factorLabel : undefined}
            />
            <GapColumn gap={gap} />
          </Fragment>
        ))}
        {showEllipsis && <span className={s.ellipsis()}>···</span>}
        {tail && <GapColumn gap={tail} />}
        <AttemptColumn number={hasLimit ? formatNumber(maxAttempts) : '∞'} />
        <div className={s.terminal()}>{terminalContent}</div>
      </div>
    </IllustrationSurfaceRoot>
  );
}

export function RetryPolicyExplanation({
  hasLimit,
  className,
}: {
  hasLimit: boolean;
  className?: string;
}) {
  const item = explanationItemStyles({ surface: 'light' });
  return (
    <ul className={className}>
      <li className={item}>
        <strong className="font-medium">Backoff:</strong> after a failed attempt
        Restate waits the initial interval, then multiplies the wait by the
        exponential factor on every retry until it reaches the max interval.
      </li>
      <li className={item}>
        <strong className="font-medium">Attempts:</strong>{' '}
        {hasLimit
          ? 'once the attempts are exhausted the invocation is paused or killed, as configured.'
          : 'without a limit the invocation keeps retrying until it succeeds or is cancelled.'}
      </li>
    </ul>
  );
}
