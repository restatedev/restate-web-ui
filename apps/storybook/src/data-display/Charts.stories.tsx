import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BarTimeSeries,
  Chart,
  Pie,
  Slice,
  TimeXAxis,
  Tooltip,
  ValueYAxis,
} from '@restate/ui-charts';
import { Link } from '@restate/ui-link';
import { Skeleton } from '@restate/ui-loading';
import { formatNumber } from '@restate/util-intl';
import { tv } from '@restate/util-styles';

interface Segment {
  name: string;
  label: string;
  count: number;
  fill: string;
  stroke: string;
  dashed?: boolean;
  hatch?: boolean;
}

const DASHED = { borderType: [8, 4] as number[], borderCap: 'round' as const };

const STYLE = {
  scheduled: {
    fill: 'var(--background-color-emphasis)',
    stroke: 'var(--background-color-neutral)',
  },
  new: {
    fill: 'var(--background-color-queued)',
    stroke: 'var(--border-color-queued)',
  },
  'backing-off': {
    fill: 'var(--background-color-warning-strong)',
    stroke: 'var(--background-color-warning)',
  },
  running: {
    fill: 'var(--background-color-info-strong)',
    stroke: 'var(--background-color-info)',
  },
  suspended: {
    fill: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral-strong)',
  },
  paused: {
    fill: 'var(--background-color-warning-strong)',
    stroke: 'var(--background-color-warning)',
  },
  succeeded: {
    fill: 'var(--background-color-success-strong)',
    stroke: 'var(--background-color-success)',
  },
  failed: {
    fill: 'var(--background-color-danger-strong)',
    stroke: 'var(--background-color-danger)',
  },
  cancelled: {
    fill: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral-strong)',
  },
  killed: {
    fill: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral-strong)',
  },
};

const inFlight: Segment[] = [
  {
    name: 'scheduled',
    label: 'Scheduled',
    count: 12,
    ...STYLE.scheduled,
    dashed: true,
  },
  {
    name: 'new',
    label: 'New',
    count: 8,
    ...STYLE.new,
    dashed: true,
    hatch: true,
  },
  {
    name: 'backing-off',
    label: 'Backing off',
    count: 5,
    ...STYLE['backing-off'],
    dashed: true,
  },
  {
    name: 'running',
    label: 'Running',
    count: 124,
    ...STYLE.running,
    dashed: true,
  },
  { name: 'suspended', label: 'Suspended', count: 342, ...STYLE.suspended },
  { name: 'paused', label: 'Paused', count: 3, ...STYLE.paused },
];

const completed: Segment[] = [
  { name: 'succeeded', label: 'Succeeded', count: 18240, ...STYLE.succeeded },
  { name: 'failed', label: 'Failed', count: 214, ...STYLE.failed },
  { name: 'cancelled', label: 'Cancelled', count: 31, ...STYLE.cancelled },
  { name: 'killed', label: 'Killed', count: 4, ...STYLE.killed },
];

const gaugeStyles = tv({
  base: 'relative aspect-square w-[11.25rem] shrink-0 overflow-visible',
});

const chartStyles = tv({
  base: 'absolute inset-0',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

function StatusArc({
  segments,
  isLoading,
}: {
  segments: Segment[];
  isLoading?: boolean;
}) {
  const items = segments.filter((segment) => segment.count > 0);
  return (
    <div className={chartStyles({ isLoading })}>
      <Chart width="100%" height="100%">
        <Tooltip trigger="item" formatValue={(value) => formatNumber(value)} />
        <Pie
          radius={['85%', '92%']}
          center={['50%', '50%']}
          startAngle={210}
          endAngle={-30}
          padAngle={2.5}
          minAngle={5}
          showLabel={false}
          gradient={items.length > 0}
          silent={items.length === 0}
        >
          {items.length > 0 ? (
            items.map((segment) => (
              <Slice
                key={segment.name}
                name={segment.label}
                value={segment.count}
                color={segment.fill}
                borderColor={segment.stroke}
                borderWidth={1.5}
                borderRadius={6}
                shadowBlur={4}
                shadowColor="color-mix(in oklab, var(--box-shadow-color-default) 15%, transparent)"
                shadowOffsetY={1}
                {...(segment.dashed ? DASHED : {})}
                hatchColor={
                  segment.hatch
                    ? 'var(--background-color-hatch-pending)'
                    : undefined
                }
              />
            ))
          ) : (
            <Slice
              name="Loading"
              value={1}
              color="color-mix(in oklab, var(--background-color-strong) 55%, transparent)"
              borderColor="color-mix(in oklab, var(--border-color-strong) 60%, transparent)"
              borderWidth={1}
              borderRadius={6}
            />
          )}
        </Pie>
      </Chart>
    </div>
  );
}

function Gauge({
  segments,
  label,
  href,
  isLoading,
}: {
  segments: Segment[];
  label: string;
  href: string;
  isLoading?: boolean;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  return (
    <div className={gaugeStyles()}>
      <StatusArc segments={segments} isLoading={isLoading} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
        {isLoading ? (
          <Skeleton shape="block" className="block h-7 w-14 sm:h-8" />
        ) : (
          <Link
            href={href}
            variant="icon"
            preserveQueryParams={false}
            className="pointer-events-auto relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 leading-none hover:bg-tint-subtle"
          >
            <span className="text-2xl font-semibold text-primary tabular-nums">
              {formatNumber(total, true)}
            </span>
            <span className="mt-1 text-xs text-muted">{label}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

const meta = {
  title: 'Data display/Charts',
  component: Chart,
  args: { children: null },
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InFlightGauge: Story = {
  render: () => (
    <Gauge segments={inFlight} label="In-flight" href="/invocations" />
  ),
};

export const CompletedGauge: Story = {
  render: () => (
    <Gauge segments={completed} label="Completed" href="/invocations" />
  ),
};

export const LoadingGauge: Story = {
  render: () => (
    <Gauge segments={[]} label="In-flight" href="/invocations" isLoading />
  ),
};

interface Bucket {
  start: number;
  end: number;
  invocations: number;
}

const HOUR = 3_600_000;
const FIRST_BUCKET = Date.parse('2026-11-22T11:00:00Z');
const counts = [
  42, 38, 51, 47, 63, 58, 71, 96, 128, 142, 131, 119, 124, 138, 155, 149, 133,
  121, 98, 84, 76, 69, 61, 54,
];

const buckets: Bucket[] = counts.map((invocations, index) => ({
  start: FIRST_BUCKET + index * HOUR,
  end: FIRST_BUCKET + (index + 1) * HOUR,
  invocations,
}));

export const InvocationsPerHour: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="h-48 w-full max-w-2xl">
      <Chart data={buckets} width="100%" height="100%">
        <TimeXAxis dataKey="start" />
        <ValueYAxis />
        <Tooltip
          trigger="item"
          formatValue={(value) => formatNumber(value)}
          series={[{ dataKey: 'invocations', label: 'invocations' }]}
        />
        <BarTimeSeries
          dataKey="invocations"
          startRangeKey="start"
          endRangeKey="end"
          color="var(--background-color-info)"
          fillColor="var(--background-color-info-strong)"
        />
      </Chart>
    </div>
  ),
};
