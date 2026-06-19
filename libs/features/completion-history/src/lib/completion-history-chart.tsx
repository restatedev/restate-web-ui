import { Chart, Series, TimeXAxis, Tooltip, YAxis } from '@restate/ui/charts';
import { formatHourRange, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const containerStyles = tv({
  base: 'relative min-w-0',
});

const SUCCEEDED_STROKE = '#22c55e';
const SUCCEEDED_FILL = '#86efac';
const FAILED_STROKE = '#ef4444';
const FAILED_FILL = '#fca5a5';

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

  return (
    <div className={containerStyles({ className })}>
      <div className="pointer-events-none absolute inset-y-1.5 right-0 left-14 z-0">
        {maxSucceeded > 0 && (
          <span className="absolute inset-x-0 top-0 border-t border-dashed border-black/10" />
        )}
        {maxFailed > 0 && (
          <span className="absolute inset-x-0 bottom-0 border-t border-dashed border-black/10" />
        )}
      </div>
      <div className="relative z-10 h-full w-full">
        <Chart<CompletionRow>
          data={data}
          width="100%"
          height="100%"
          renderer="canvas"
        >
          <TimeXAxis<CompletionRow> dataKey="start" show={false} />
          <YAxis<CompletionRow>
            type="value"
            min={yAxisMin}
            max={yAxisMax}
            visibleValues={[yAxisMin, yAxisMax]}
            show
            labelFormatter={(value) => formatNumber(Math.abs(value), true)}
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
            barWidth={5}
            gap={1}
            baselineGap={3}
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
            barWidth={5}
            gap={1}
            baselineGap={3}
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
