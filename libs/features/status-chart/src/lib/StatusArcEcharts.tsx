import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Chart, Pie, Slice, Tooltip } from '@restate/ui-charts';
import { tv } from '@restate/util-styles';
import { formatApproxPercentage, formatNumber } from '@restate/util-intl';
import { type ArcSegment } from './heroSegments';

export const chartContainerStyles = tv({
  base: 'absolute inset-0',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

export function StatusArcEcharts({
  segments,
  isLoading,
  valueFormat = 'count',
}: {
  segments: ArcSegment[];
  isLoading?: boolean;
  valueFormat?: 'count' | 'approximate-percentage';
}) {
  const items = useMemo(() => segments.filter((s) => s.count > 0), [segments]);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items],
  );
  const navigate = useNavigate();

  return (
    <div className={chartContainerStyles({ isLoading })}>
      <Chart width="100%" height="100%">
        <Tooltip
          trigger="item"
          formatValue={(value) =>
            valueFormat === 'approximate-percentage' && total > 0
              ? formatApproxPercentage(Number(value) / total)
              : formatNumber(value)
          }
        />
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
            items.map((s) => (
              <Slice
                key={s.name}
                name={s.label}
                value={s.count}
                color={s.fillLight}
                borderColor={s.stroke}
                borderWidth={1.5}
                borderType={s.borderType}
                borderCap={s.borderCap}
                borderRadius={6}
                shadowBlur={4}
                shadowColor="color-mix(in oklab, var(--box-shadow-color-default) 15%, transparent)"
                shadowOffsetY={1}
                hatchColor={
                  s.name === 'inbox' || s.name === 'pending'
                    ? 'var(--background-color-hatch-pending)'
                    : undefined
                }
                onSelect={() => navigate(s.href)}
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
