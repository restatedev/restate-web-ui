import {
  BarTimeSeries,
  CartesianGrid,
  Chart,
  TimeXAxis,
  Tooltip,
  ValueYAxis,
} from '@restate/ui/charts';
import { formatHourRange, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import type { Ref } from 'react';

const containerStyles = tv({
  base: 'relative min-w-0',
});

const SUCCEEDED_STROKE = '#22c55e';
const SUCCEEDED_FILL = '#86efac';
const FAILED_STROKE = '#ef4444';
const FAILED_FILL = '#fca5a5';
const BAR_MIN_HEIGHT = 1.5;
const BAR_BASELINE_GAP = 3;

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
  ref?: Ref<HTMLDivElement>;
};

export function CompletionHistoryChart({
  buckets,
  isPending,
  className,
  onBucketClick,
  ref,
}: CompletionHistoryChartProps) {
  if (isPending) {
    return (
      <div ref={ref} className={containerStyles({ className })}>
        <div className="h-full w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  const hasCompletedInvocations = buckets.some(
    (bucket) => bucket.succeeded > 0 || bucket.failed > 0,
  );

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
    <div ref={ref} className={containerStyles({ className })}>
      <div className="relative z-10 h-full w-full translate-y-2">
        <Chart<CompletionRow> data={data} width="100%" height="100%">
          <CartesianGrid<CompletionRow>
            top={16}
            right={0}
            bottom={32}
            left={0}
          />
          <TimeXAxis<CompletionRow> dataKey="start" show={false} />
          <ValueYAxis<CompletionRow>
            position="right"
            {...(hasCompletedInvocations
              ? {
                  min: yAxisMin,
                  max: yAxisMax,
                  interval: yAxisInterval,
                  visibleValues: [yAxisMin, yAxisMax],
                  show: true,
                  labelInside: true,
                  splitLine: true,
                  labelFormatter: (value) => {
                    const label = formatNumber(Math.abs(value), true);
                    if (Math.abs(value - yAxisMax) < 1) return `${label}\n`;
                    if (Math.abs(value - yAxisMin) < 1) return `\n\n${label}`;
                    return label;
                  },
                }
              : {
                  min: -1,
                  max: 1,
                  interval: 2,
                  visibleValues: [-1, 1],
                  show: true,
                  labelInside: true,
                  splitLine: true,
                  labelFormatter: () => '',
                })}
          />
          <Tooltip
            trigger="item"
            formatRange={formatHourRange}
            formatValue={(value) => formatNumber(Math.abs(value))}
            series={TOOLTIP_SERIES}
          />
          <BarTimeSeries
            name="Succeeded"
            dataKey="succeeded"
            startRangeKey="start"
            endRangeKey="end"
            color={SUCCEEDED_STROKE}
            fillColor={SUCCEEDED_FILL}
            barWidth={6}
            gap={0.25}
            baselineGap={BAR_BASELINE_GAP}
            minBarHeight={hasCompletedInvocations ? BAR_MIN_HEIGHT : 0}
            clip={false}
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
          <BarTimeSeries
            name="Failed, Cancelled or Killed"
            dataKey="failed"
            startRangeKey="start"
            endRangeKey="end"
            color={FAILED_STROKE}
            fillColor={FAILED_FILL}
            barWidth={6}
            gap={0.25}
            baselineGap={BAR_BASELINE_GAP}
            minBarHeight={hasCompletedInvocations ? BAR_MIN_HEIGHT : 0}
            clip={false}
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
        {!hasCompletedInvocations && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-3 text-center text-sm font-medium whitespace-nowrap text-gray-400">
            No completed invocations
          </div>
        )}
      </div>
    </div>
  );
}

export default CompletionHistoryChart;
