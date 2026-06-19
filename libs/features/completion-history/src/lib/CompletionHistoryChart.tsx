import {
  CartesianGrid,
  Chart,
  Series,
  TimeXAxis,
  Tooltip,
  YAxis,
} from '@restate/ui/charts';
import { formatHourRange, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const containerStyles = tv({
  base: 'relative min-w-0',
});

const SUCCEEDED_STROKE = '#22c55e';
const SUCCEEDED_FILL = '#86efac';
const FAILED_STROKE = '#ef4444';
const FAILED_FILL = '#fca5a5';
const BAR_MIN_HEIGHT = 4;
const BAR_BASELINE_GAP = 3;
const BAR_BASELINE_EDGE_GAP = BAR_MIN_HEIGHT + BAR_BASELINE_GAP + 2;

const TOOLTIP_SERIES = [
  { dataKey: 'succeeded', label: 'Succeeded', color: SUCCEEDED_STROKE },
  {
    dataKey: 'failed',
    label: 'Failed, Cancelled or Killed',
    color: FAILED_STROKE,
  },
];

type CompletionBucket = {
  start: string;
  end: string;
  succeeded: number;
  failed: number;
};

export type CompletionBucketOutcome = 'succeeded' | 'failed';

type CompletionRow = {
  start: number;
  end: number;
  succeeded: number;
  failed: number;
};

type CompletionHistoryChartProps = {
  buckets: CompletionBucket[];
  isPending?: boolean;
  className?: string;
  onBucketClick?: (
    bucket: CompletionBucket,
    outcome: CompletionBucketOutcome,
  ) => void;
};

export function CompletionHistoryChart({
  buckets,
  isPending,
  className,
  onBucketClick,
}: CompletionHistoryChartProps) {
  if (isPending) {
    return (
      <div className={containerStyles({ className })}>
        <div className="h-full w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  const hasCompletedInvocations = buckets.some(
    (bucket) => bucket.succeeded > 0 || bucket.failed > 0,
  );
  if (!hasCompletedInvocations) {
    return (
      <div className={containerStyles({ className })}>
        <div className="relative z-10 flex h-full w-full translate-y-3.5 items-center justify-center px-3 text-center text-sm font-medium whitespace-nowrap text-gray-400 sm:text-base">
          No completed invocations
        </div>
      </div>
    );
  }

  const data: CompletionRow[] = buckets.map((bucket) => ({
    start: Date.parse(bucket.start),
    end: Date.parse(bucket.end),
    succeeded: bucket.succeeded,
    failed: -bucket.failed,
  }));
  const maxSucceeded = Math.max(
    0,
    ...buckets.map((bucket) => bucket.succeeded),
  );
  const maxFailed = Math.max(0, ...buckets.map((bucket) => bucket.failed));
  const yAxisMax = Math.max(1, maxSucceeded);
  const yAxisMin = -Math.max(1, maxFailed);
  const yAxisInterval = yAxisMax - yAxisMin;

  return (
    <div className={containerStyles({ className })}>
      <div className="relative z-10 h-full w-full">
        <Chart<CompletionRow>
          data={data}
          width="100%"
          height="100%"
          renderer="canvas"
        >
          <CartesianGrid<CompletionRow>
            top={16}
            right={0}
            bottom={16}
            left={0}
          />
          <TimeXAxis<CompletionRow> dataKey="start" show={false} />
          <YAxis<CompletionRow>
            type="value"
            position="right"
            min={yAxisMin}
            max={yAxisMax}
            interval={yAxisInterval}
            visibleValues={[yAxisMin, yAxisMax]}
            show
            labelInside
            splitLine
            labelFormatter={(value) => {
              const label = formatNumber(Math.abs(value), true);
              if (Math.abs(value - yAxisMax) < 1) return `${label}\n`;
              if (Math.abs(value - yAxisMin) < 1) return `\n\n${label}`;
              return label;
            }}
          />
          <Tooltip
            trigger="item"
            formatRange={formatHourRange}
            formatValue={(value) => formatNumber(Math.abs(value))}
            series={TOOLTIP_SERIES}
          />
          <Series
            type="bar-time"
            name="Succeeded"
            dataKey="succeeded"
            startRangeKey="start"
            endRangeKey="end"
            color={SUCCEEDED_STROKE}
            fillColor={SUCCEEDED_FILL}
            barWidth={6}
            gap={0.25}
            baselineGap={BAR_BASELINE_GAP}
            minBarHeight={BAR_MIN_HEIGHT}
            minBaselineEdgeGap={BAR_BASELINE_EDGE_GAP}
            cursor={onBucketClick ? 'pointer' : undefined}
            liveIndex={data.length - 1}
            onSelect={
              onBucketClick
                ? ({ dataIndex }) => {
                    const bucket = buckets[dataIndex];
                    if (bucket) onBucketClick(bucket, 'succeeded');
                  }
                : undefined
            }
          />
          <Series
            type="bar-time"
            name="Failed, Cancelled or Killed"
            dataKey="failed"
            startRangeKey="start"
            endRangeKey="end"
            color={FAILED_STROKE}
            fillColor={FAILED_FILL}
            barWidth={6}
            gap={0.25}
            baselineGap={BAR_BASELINE_GAP}
            minBarHeight={BAR_MIN_HEIGHT}
            minBaselineEdgeGap={BAR_BASELINE_EDGE_GAP}
            cursor={onBucketClick ? 'pointer' : undefined}
            liveIndex={data.length - 1}
            onSelect={
              onBucketClick
                ? ({ dataIndex }) => {
                    const bucket = buckets[dataIndex];
                    if (bucket) onBucketClick(bucket, 'failed');
                  }
                : undefined
            }
          />
        </Chart>
      </div>
    </div>
  );
}

export default CompletionHistoryChart;
