import { formatNumber } from '@restate/util/intl';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import type { ComponentPropsWithoutRef } from 'react';

export interface MetricComparisonProps extends Omit<
  ComponentPropsWithoutRef<'span'>,
  'children'
> {
  value: string | number;
  ratio?: string | number;
  average?: string | number;
  qualifier?: string;
  label: string;
  size?: 'xs' | 'sm';
  decorative?: boolean;
}

const styles = tv({
  slots: {
    root: 'inline-flex min-w-0 shrink-0 items-baseline gap-1.5 whitespace-nowrap tabular-nums',
    valueGroup: 'inline-flex items-baseline gap-1',
    value: 'font-medium text-zinc-600',
    qualifier: 'font-normal text-gray-400',
    visual:
      'inline-flex shrink-0 items-baseline gap-[0.28em] rounded-[0.35em] border px-[0.3em] py-[0.12em] text-[1em] leading-none outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/30',
    icon: 'h-[0.88em] w-[0.88em] shrink-0 self-center stroke-2',
    approximation: 'self-center text-[0.82em] font-medium leading-none',
    measure: 'inline-flex items-baseline gap-[0.04em]',
    ratio: 'font-medium',
    multiplier: 'text-[1.08em] font-medium opacity-80',
    reference: 'ml-[0.08em] text-[0.8em] font-medium opacity-70',
  },
  variants: {
    size: {
      xs: {
        root: 'text-3xs',
      },
      sm: {
        root: 'text-xs',
      },
    },
    tone: {
      faster: {
        visual: 'border-sky-200/80 bg-sky-50/70 text-sky-700',
      },
      typical: {
        visual: 'border-zinc-200 bg-zinc-50/80 text-zinc-600',
      },
      slower: {
        visual: 'border-amber-200/80 bg-amber-50/70 text-amber-700',
      },
      slowest: {
        visual: 'border-orange-200/80 bg-orange-50/70 text-orange-700',
      },
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

function ratioNumber(ratio: string | number) {
  if (typeof ratio === 'number') return ratio;
  const parsed = Number.parseFloat(ratio.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ratioLabel(ratio: string | number) {
  return `${ratioValueLabel(ratio)}×`;
}

function ratioValueLabel(ratio: string | number) {
  return typeof ratio === 'number' ? formatNumber(ratio) : ratio;
}

function ratioTone(ratio: number) {
  if (ratio < 0.9) return 'faster' as const;
  if (ratio <= 1.1) return 'typical' as const;
  if (ratio <= 1.5) return 'slower' as const;
  return 'slowest' as const;
}

function ratioIcon(ratio: number) {
  if (ratio < 0.9) return IconName.TrendingDown;
  if (ratio <= 1.1) return undefined;
  return IconName.TrendingUp;
}

export function MetricComparison({
  value,
  ratio,
  average,
  qualifier,
  label,
  size,
  decorative = false,
  className,
  ...props
}: MetricComparisonProps) {
  const numericRatio = ratio === undefined ? undefined : ratioNumber(ratio);
  const tone = numericRatio === undefined ? undefined : ratioTone(numericRatio);
  const icon = numericRatio === undefined ? undefined : ratioIcon(numericRatio);
  const style = styles({ size, tone });
  const comparison =
    ratio === undefined ? undefined : `${ratioLabel(ratio)} historical average`;
  const displayValue = `${value}${qualifier ? ` ${qualifier}` : ''}`;
  const title = comparison
    ? `${label}: ${displayValue}; ${comparison}${average !== undefined ? ` (${average})` : ''}`
    : `${label}: ${displayValue}`;

  return (
    <span {...props} className={style.root({ className })}>
      <span className={style.valueGroup()}>
        <span className={style.value()}>{value}</span>
        {qualifier && (
          <>
            {' '}
            <span className={style.qualifier()}>{qualifier}</span>
          </>
        )}
      </span>
      {ratio !== undefined &&
        tone !== undefined &&
        comparison !== undefined && (
          <span
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : comparison}
            aria-hidden={decorative || undefined}
            title={title}
            tabIndex={decorative ? undefined : 0}
            className={style.visual()}
          >
            {icon ? (
              <Icon aria-hidden name={icon} className={style.icon()} />
            ) : (
              <span aria-hidden="true" className={style.approximation()}>
                ≈
              </span>
            )}
            <span aria-hidden="true" className={style.measure()}>
              <span className={style.ratio()}>{ratioValueLabel(ratio)}</span>
              <span className={style.multiplier()}>x</span>
            </span>
            <span aria-hidden="true" className={style.reference()}>
              avg
            </span>
          </span>
        )}
    </span>
  );
}
