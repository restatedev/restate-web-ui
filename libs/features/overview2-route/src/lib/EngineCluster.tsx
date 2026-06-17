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

const rateFormat = (n: number) => formatNumber(n);
const countFormat = (n: number) => formatNumber(Math.round(n), true);
const bytesRateFormat = (n: number) => `${formatBytes(n, 'MiB')}/s`;

function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    ref.current?.animate([{ opacity: 0.5 }, { opacity: 1 }], {
      duration: 300,
      easing: 'ease-out',
    });
  }, [value]);
  return (
    <span ref={ref} className={className}>
      {format(value)}
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
  base: 'group/metric flex flex-col items-start leading-none',
});

const valueSlotStyles = tv({
  base: 'flex h-5 items-center',
  variants: {
    width: {
      count: 'w-9',
      rate: 'w-14',
      bytes: 'w-20',
    },
  },
});

const metricValueStyles = tv({
  base: 'text-sm font-medium text-gray-500 tabular-nums transition-colors group-hover/metric:text-gray-700',
});

const metricUnitStyles = tv({
  base: 'text-2xs font-normal text-gray-400 transition-colors group-hover/metric:text-gray-500',
});

const metricLabelStyles = tv({
  base: 'mt-1 text-2xs whitespace-nowrap text-gray-400 transition-colors group-hover/metric:text-gray-500',
});

const metricSparklineStyles = tv({
  base: 'mt-1 text-slate-400 transition-[color,opacity] group-hover/metric:text-slate-500 group-hover/metric:opacity-90',
});

function Metric({
  value,
  format,
  label,
  unit,
  tooltip,
  isLoading,
  className,
  history,
  width = 'rate',
}: {
  value: number;
  format: (n: number) => string;
  label: string;
  unit?: string;
  tooltip: ReactNode;
  isLoading?: boolean;
  className?: string;
  history?: number[];
  width?: 'count' | 'rate' | 'bytes';
}) {
  return (
    <HoverTooltip content={tooltip}>
      <div className={metricStyles({ class: className })}>
        <span className={valueSlotStyles({ width })}>
          {isLoading ? (
            <span className="h-3.5 w-8 animate-pulse rounded bg-gray-200" />
          ) : (
            <span className="flex items-baseline gap-0.5 whitespace-nowrap">
              <AnimatedNumber
                value={value}
                format={format}
                className={metricValueStyles()}
              />
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

type MetricKey = keyof ReturnType<typeof toValues>;
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
  format: (n: number) => string;
  unit?: string;
  label: string;
  width: 'count' | 'rate' | 'bytes';
  tooltip: ReactNode;
  className?: string;
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
    className: 'w-20',
    tooltip: 'Inbound client connections currently open to the ingress.',
  },
  awaiting: {
    valueKey: 'waiting',
    format: countFormat,
    label: 'Awaiting',
    width: 'count',
    className: 'w-20',
    tooltip:
      'Inbound requests currently waiting for an invocation result (request/response calls and attaches).',
  },
  slotsUsed: {
    valueKey: 'slots_used',
    format: countFormat,
    label: 'Slots used',
    width: 'count',
    className: 'w-20',
    tooltip:
      'Concurrency slots currently in use. Slots cap how many invocations run against your services at the same time.',
  },
  ingress: {
    valueKey: 'ingress_mibps',
    format: bytesRateFormat,
    label: 'Ingress I/O',
    width: 'bytes',
    className: 'w-20',
    tooltip:
      'Data moving through the ingress — HTTP request and response bodies, in and out.',
  },
  deploymentIo: {
    valueKey: 'invoker_mibps',
    format: bytesRateFormat,
    label: 'Deployment I/O',
    width: 'bytes',
    className: 'w-20',
    tooltip:
      'Data Restate exchanges with your service deployments to run invocations — sent and received.',
  },
  durableEntries: {
    valueKey: 'events_per_sec',
    format: rateFormat,
    unit: '/s',
    label: 'Journal entries',
    width: 'rate',
    tooltip:
      'Durable journal entries recorded per second — every command an invocation issues and every result that completes one.',
  },
  durableWrite: {
    valueKey: 'log_mibps',
    format: bytesRateFormat,
    label: 'Journal write',
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
  const hasActivity = ACTIVITY_KEYS.some(
    (key) => m[key] > 0 || history[key]?.some((v) => v > 0),
  );
  const state: 'visible' | 'idle' | 'stale' = !hasActivity
    ? 'idle'
    : isError
      ? 'stale'
      : 'visible';

  return { m, isLoading: isPending && !data, history, state };
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

const metricsStateVariants = {
  visible: '',
  idle: '',
  stale: 'opacity-40',
} as const;

const metricGroupStyles = tv({
  base: 'transition-opacity',
  variants: {
    layout: {
      underGauge: 'flex items-start justify-center gap-2',
      telemetry: 'flex flex-wrap items-start justify-center gap-x-2 gap-y-1.5',
      rail: 'flex flex-col items-start gap-3',
    },
    state: metricsStateVariants,
  },
});

function MetricsGroup({
  ids,
  layout,
  hasSummaryActivity = true,
  className,
  itemClassName,
  ...props
}: {
  ids: readonly MetricId[];
  layout: 'underGauge' | 'telemetry' | 'rail';
  hasSummaryActivity?: boolean;
  className?: string;
  itemClassName?: string;
} & ComponentPropsWithoutRef<'div'>) {
  const { m, isLoading, history, state } = useMetricsHistory();
  if (!hasSummaryActivity && state === 'idle') return null;
  return (
    <div
      {...props}
      className={metricGroupStyles({ layout, state, class: className })}
    >
      {ids.map((id) => {
        const spec = metricSpecs[id];
        return (
          <Metric
            key={id}
            value={m[spec.valueKey]}
            format={spec.format}
            unit={spec.unit}
            label={spec.label}
            width={spec.width}
            className={itemClassName ?? spec.className}
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
      itemClassName="w-20"
      {...props}
    />
  );
}
