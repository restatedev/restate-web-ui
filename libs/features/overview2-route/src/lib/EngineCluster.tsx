import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { tv } from '@restate/util/styles';
import { formatNumber, formatBytes } from '@restate/util/intl';
import {
  RestateServer,
  type FerrofluidStatus,
} from '@restate/ui/restate-server';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useGetMetrics } from '@restate/data-access/admin-api-hooks';

const rateFormat = (n: number) => formatNumber(n, true);
const countFormat = (n: number) => formatNumber(Math.round(n), true);
const bytesRateFormat = (n: number) => `${formatBytes(n, 'MiB')}/s`;

function AnimatedValue({
  animationKey,
  className,
  children,
}: {
  animationKey: number | string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(animationKey);
  useEffect(() => {
    if (prev.current === animationKey) return;
    prev.current = animationKey;
    ref.current?.animate([{ opacity: 0.5 }, { opacity: 1 }], {
      duration: 300,
      easing: 'ease-out',
    });
  }, [animationKey]);
  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

const SPARK_WIDTH = 40;
const SPARK_HEIGHT = 10;

function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          width: SPARK_WIDTH,
          height: SPARK_HEIGHT,
        }}
      />
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const lastIndex = values.length - 1;
  const coords = values.map((v, i): [number, number] => [
    (i / lastIndex) * SPARK_WIDTH,
    SPARK_HEIGHT - 1 - ((v - min) / range) * (SPARK_HEIGHT - 2),
  ]);
  const line = coords
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  return (
    <svg
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      fill="none"
      className={className}
    >
      <polyline
        points={line}
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const metricStyles = tv({
  base: 'group/metric flex min-w-0 flex-col items-start leading-none',
  variants: {
    size: {
      auto: '',
      regular: 'w-20',
      wide: 'w-[5.5rem] @min-[108rem]/hero:w-28',
    },
  },
  defaultVariants: {
    size: 'auto',
  },
});

const valueSlotStyles = tv({
  base: 'flex h-5 items-center',
  variants: {
    width: {
      count: 'w-9',
      rate: 'w-14',
      bytes: 'w-20',
      slots: 'w-20',
    },
  },
});

const metricValueStyles = tv({
  base: 'text-sm font-medium text-gray-500 tabular-nums transition-colors group-hover/metric:text-gray-700',
});

const metricSecondaryValueStyles = tv({
  base: 'text-2xs font-normal text-gray-400 transition-colors group-hover/metric:text-gray-500',
});

const metricUnitStyles = tv({
  base: 'text-2xs font-normal text-gray-400 transition-colors group-hover/metric:text-gray-500',
});

const metricLabelStyles = tv({
  base: 'mt-1 block max-w-full truncate text-2xs font-medium text-gray-400 transition-colors group-hover/metric:text-gray-600',
});

const metricSparklineStyles = tv({
  base: 'mt-1 text-slate-400 transition-[color,opacity] group-hover/metric:text-slate-500 group-hover/metric:opacity-90',
});

function Metric({
  value,
  format,
  renderValue,
  animationKey = value,
  label,
  unit,
  tooltip,
  isLoading,
  className,
  history,
  size = 'auto',
  width = 'rate',
}: {
  value: number;
  format: (n: number) => string;
  renderValue?: ReactNode;
  animationKey?: number | string;
  label: string;
  unit?: string;
  tooltip: ReactNode;
  isLoading?: boolean;
  className?: string;
  history?: number[];
  size?: 'auto' | 'regular' | 'wide';
  width?: 'count' | 'rate' | 'bytes' | 'slots';
}) {
  return (
    <HoverTooltip content={tooltip}>
      <div className={metricStyles({ size, class: className })}>
        <span className={valueSlotStyles({ width })}>
          {isLoading ? (
            <span className="h-3.5 w-8 animate-pulse rounded bg-gray-200" />
          ) : (
            <span className="flex items-baseline gap-0.5 whitespace-nowrap">
              <AnimatedValue
                animationKey={animationKey}
                className={metricValueStyles()}
              >
                {renderValue ?? format(value)}
              </AnimatedValue>
              {unit && <span className={metricUnitStyles()}>{unit}</span>}
            </span>
          )}
        </span>
        <span className={metricLabelStyles()}>{label}</span>
        <Sparkline
          values={isLoading ? [] : (history ?? [])}
          className={metricSparklineStyles()}
        />
      </div>
    </HoverTooltip>
  );
}

type MetricsData = ReturnType<typeof useGetMetrics>['data'];

function toValues(data: MetricsData) {
  return {
    invocations_per_sec: data?.invocations_per_sec ?? 0,
    events_per_sec: data?.events_per_sec ?? 0,
    actions_per_sec: data?.actions_per_sec ?? 0,
    invoker_mibps: data?.invoker_mibps ?? 0,
    slots_available: data?.slots_available ?? 0,
    slots_used: data?.slots_used ?? 0,
    ingress_mibps: data?.ingress_mibps ?? 0,
    connections: data?.connections ?? 0,
    waiting: data?.waiting ?? 0,
    log_mibps: data?.log_mibps ?? 0,
  };
}

type MetricValues = ReturnType<typeof toValues>;
type MetricKey = keyof MetricValues;
type MetricHistory = Partial<Record<MetricKey, number[]>>;

const IN_FLIGHT_METRIC_IDS = ['invocations', 'actions'] as const;
const EGRESS_METRIC_IDS = [
  'connections',
  'awaiting',
  'slotsUsed',
  'ingress',
  'deploymentIo',
] as const;
const COMPLETED_METRIC_IDS = ['durableEntries', 'durableWrite'] as const;
const LEFT_RAIL_METRIC_IDS = [
  'invocations',
  'connections',
  'slotsUsed',
  'deploymentIo',
  'durableWrite',
] as const;
const RIGHT_RAIL_METRIC_IDS = [
  'actions',
  'awaiting',
  'ingress',
  'durableEntries',
] as const;

type MetricId =
  | (typeof IN_FLIGHT_METRIC_IDS)[number]
  | (typeof EGRESS_METRIC_IDS)[number]
  | (typeof COMPLETED_METRIC_IDS)[number];
type MetricSpec = {
  valueKey: MetricKey;
  format: (n: number, values: MetricValues) => string;
  renderValue?: (n: number, values: MetricValues) => ReactNode;
  animationKey?: (n: number, values: MetricValues) => number | string;
  unit?: string;
  label: string;
  width: 'count' | 'rate' | 'bytes' | 'slots';
  tooltip: ReactNode;
};

const metricSpecs: Record<MetricId, MetricSpec> = {
  invocations: {
    valueKey: 'invocations_per_sec',
    format: rateFormat,
    unit: '/s',
    label: 'Invocations',
    width: 'rate',
    tooltip: 'New invocations starting across your services, per second.',
  },
  actions: {
    valueKey: 'actions_per_sec',
    format: rateFormat,
    unit: '/s',
    label: 'Actions',
    width: 'rate',
    tooltip:
      "Restate's metered unit of work. Each operation counts as at least one action, with larger payloads adding one action per 64 KiB.",
  },
  connections: {
    valueKey: 'connections',
    format: countFormat,
    label: 'Connections',
    width: 'count',
    tooltip: 'Inbound client connections currently open to the ingress.',
  },
  awaiting: {
    valueKey: 'waiting',
    format: countFormat,
    label: 'Awaiting results',
    width: 'count',
    tooltip:
      'Inbound requests currently waiting for an invocation result (request/response calls and attaches).',
  },
  slotsUsed: {
    valueKey: 'slots_used',
    format: (used, values) => {
      const total = used + values.slots_available;
      return total > 0
        ? `${countFormat(used)}/${countFormat(total)}`
        : countFormat(used);
    },
    renderValue: (used, values) => {
      const total = used + values.slots_available;
      if (total <= 0) return countFormat(used);
      return (
        <>
          {countFormat(used)}
          <span className={metricSecondaryValueStyles()}>
            /{countFormat(total)}
          </span>
        </>
      );
    },
    animationKey: (used, values) => `${used}/${values.slots_available}`,
    label: 'Concurrency slots',
    width: 'slots',
    tooltip:
      'Concurrency slots currently in use, shown as used/total. Slots cap how many invocations run against your services at the same time.',
  },
  ingress: {
    valueKey: 'ingress_mibps',
    format: bytesRateFormat,
    label: 'Ingress I/O',
    width: 'bytes',
    tooltip:
      'Data moving through the ingress — HTTP request and response bodies, in and out.',
  },
  deploymentIo: {
    valueKey: 'invoker_mibps',
    format: bytesRateFormat,
    label: 'Deployments I/O',
    width: 'bytes',
    tooltip:
      'Data Restate exchanges with your service deployments to run invocations — sent and received.',
  },
  durableEntries: {
    valueKey: 'events_per_sec',
    format: rateFormat,
    unit: '/s',
    label: 'Log events',
    width: 'rate',
    tooltip:
      'Durable log events recorded per second — every command an invocation issues and every result that completes one.',
  },
  durableWrite: {
    valueKey: 'log_mibps',
    format: bytesRateFormat,
    label: 'Log throughput',
    width: 'bytes',
    tooltip:
      'Data written to the durable log per second to make invocations recoverable — covers journal entries, and their associated payloads plus all other recorded activity (incoming requests, timers, and more).',
  },
};

const HISTORY_LENGTH = 24;

const ACTIVITY_KEYS: MetricKey[] = [
  'invocations_per_sec',
  'events_per_sec',
  'actions_per_sec',
  'invoker_mibps',
  'slots_used',
  'ingress_mibps',
  'connections',
  'waiting',
  'log_mibps',
];

function useMetricsHistory() {
  const { data, isPending, dataUpdatedAt, isError } = useGetMetrics();
  const [historyState, setHistoryState] = useState<{
    at: number;
    history: MetricHistory;
  }>({
    at: 0,
    history: {},
  });

  useEffect(() => {
    if (!data || !dataUpdatedAt) return;
    setHistoryState((current) => {
      if (current.at === dataUpdatedAt) return current;
      const values = toValues(data);
      const next: MetricHistory = {};
      for (const key of Object.keys(values) as MetricKey[]) {
        next[key] = [...(current.history[key] ?? []), values[key]].slice(
          -HISTORY_LENGTH,
        );
      }
      return { at: dataUpdatedAt, history: next };
    });
  }, [data, dataUpdatedAt]);

  const m = toValues(data);
  const history = historyState.history;
  const hasMetricActivity = ACTIVITY_KEYS.some(
    (key) => m[key] > 0 || history[key]?.some((v) => v > 0),
  );
  const tone: 'active' | 'quiet' | 'stale' = !hasMetricActivity
    ? 'quiet'
    : isError
      ? 'stale'
      : 'active';

  return { m, isLoading: isPending && !data, history, hasMetricActivity, tone };
}

export function useMetricsActivity() {
  const { data } = useGetMetrics();
  const m = toValues(data);
  return ACTIVITY_KEYS.some((key) => m[key] > 0);
}

const coreStyles = tv({
  base: 'relative flex justify-center',
});

export function EngineCore({
  serverRef,
  status,
  onPress,
  className,
}: {
  serverRef: React.RefObject<HTMLDivElement | null>;
  status: FerrofluidStatus;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <div className={coreStyles({ class: className })}>
      <div
        ref={serverRef}
        className="relative z-20 scale-75 @min-[64rem]/hero:scale-90"
      >
        <RestateServer status={status} onPress={onPress} />
      </div>
    </div>
  );
}

const metricsToneVariants = {
  active: '',
  quiet: '',
  stale: 'opacity-40',
} as const;

const metricGroupStyles = tv({
  base: 'transition-opacity',
  variants: {
    layout: {
      underGauge: 'flex items-start justify-center gap-3',
      telemetry: 'flex flex-nowrap items-start justify-center gap-x-1.5',
      rail: 'flex flex-col items-start gap-3',
    },
    tone: metricsToneVariants,
  },
});

function MetricsGroup({
  ids,
  layout,
  hasSummaryActivity = true,
  className,
  itemSize,
  ...props
}: {
  ids: readonly MetricId[];
  layout: 'underGauge' | 'telemetry' | 'rail';
  hasSummaryActivity?: boolean;
  className?: string;
  itemSize?: 'auto' | 'regular' | 'wide';
} & ComponentPropsWithoutRef<'div'>) {
  const { m, isLoading, history, hasMetricActivity, tone } =
    useMetricsHistory();
  if (!hasSummaryActivity && !hasMetricActivity) return null;
  return (
    <div
      {...props}
      className={metricGroupStyles({ layout, tone, class: className })}
    >
      {ids.map((id) => {
        const spec = metricSpecs[id];
        const value = m[spec.valueKey];
        return (
          <Metric
            key={id}
            value={value}
            format={(value) => spec.format(value, m)}
            renderValue={spec.renderValue?.(value, m)}
            animationKey={spec.animationKey?.(value, m)}
            unit={spec.unit}
            label={spec.label}
            width={spec.width}
            size={itemSize ?? (layout === 'telemetry' ? 'wide' : 'auto')}
            isLoading={isLoading}
            history={history[spec.valueKey]}
            tooltip={spec.tooltip}
          />
        );
      })}
    </div>
  );
}

type MetricsProps = ComponentPropsWithoutRef<'div'> & {
  hasSummaryActivity?: boolean;
};

export function InFlightMetrics(props: MetricsProps) {
  return (
    <MetricsGroup ids={IN_FLIGHT_METRIC_IDS} layout="underGauge" {...props} />
  );
}

export function CompletedMetrics(props: MetricsProps) {
  return (
    <MetricsGroup ids={COMPLETED_METRIC_IDS} layout="underGauge" {...props} />
  );
}

export function EngineEgress(props: MetricsProps) {
  return <MetricsGroup ids={EGRESS_METRIC_IDS} layout="telemetry" {...props} />;
}

export function OverviewMetricsRail({
  side,
  ...props
}: {
  side: 'left' | 'right';
} & MetricsProps) {
  return (
    <MetricsGroup
      ids={side === 'left' ? LEFT_RAIL_METRIC_IDS : RIGHT_RAIL_METRIC_IDS}
      layout="rail"
      itemSize="regular"
      {...props}
    />
  );
}
