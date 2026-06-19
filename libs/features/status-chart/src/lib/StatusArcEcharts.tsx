import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Chart, Pie, Slice, Tooltip } from '@restate/ui/charts';
import { tv } from '@restate/util/styles';
import { formatNumber } from '@restate/util/intl';
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
}: {
  segments: ArcSegment[];
  isLoading?: boolean;
}) {
  const items = useMemo(() => segments.filter((s) => s.count > 0), [segments]);
  const navigate = useNavigate();

  return (
    <div className={chartContainerStyles({ isLoading })}>
      <Chart width="100%" height="100%" theme="light" renderer="canvas">
        <Tooltip trigger="item" formatValue={(v) => formatNumber(v)} />
        <Pie
          radius={['81%', '92%']}
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
                shadowColor="rgba(0,0,0,0.15)"
                shadowOffsetY={1}
                onSelect={() => navigate(s.href)}
              />
            ))
          ) : (
            <Slice
              name="Loading"
              value={1}
              color="rgba(215,219,225,0.55)"
              borderColor="rgba(199,203,209,0.6)"
              borderWidth={1}
              borderRadius={6}
            />
          )}
        </Pie>
      </Chart>
    </div>
  );
}
