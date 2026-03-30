import { useEffect, useRef } from 'react';
import { Chart, Pie, Slice, Tooltip } from '@restate/ui/charts';
import type { ChartHandle } from '@restate/ui/charts';
import { tv } from '@restate/util/styles';
import { formatNumber } from '@restate/util/intl';
import { STATUS_LABELS } from './constants';
import { getOrderedStatuses, type StatusEntry } from './useOrderedStatuses';

export const chartContainerStyles = tv({
  base: 'absolute inset-0',
  variants: {
    isLoading: {
      true: 'animate-pulse',
      false: '',
    },
  },
});

function useLinkPieEmphasis(chartRef: React.RefObject<ChartHandle | null>) {
  useEffect(() => {
    const instance = chartRef.current?.getInstance();
    if (!instance) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onOver = (params: any) => {
      instance.dispatchAction({
        type: 'highlight',
        seriesIndex: 1,
        dataIndex: params.dataIndex,
      });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onOut = (params: any) => {
      instance.dispatchAction({
        type: 'downplay',
        seriesIndex: 1,
        dataIndex: params.dataIndex,
      });
    };

    instance.on('mouseover', { seriesType: 'pie' }, onOver);
    instance.on('mouseout', { seriesType: 'pie' }, onOut);
    return () => {
      instance.off('mouseover', onOver);
      instance.off('mouseout', onOut);
    };
  }, [chartRef]);
}

export function StatusArcEcharts({
  byStatus,
  isLoading,
}: {
  byStatus: StatusEntry[];
  isLoading?: boolean;
}) {
  const items = getOrderedStatuses(byStatus);
  const chartRef = useRef<ChartHandle>(null);

  useLinkPieEmphasis(chartRef);

  return (
    <>
      <div className={chartContainerStyles({ isLoading })}>
        <Chart ref={chartRef} width="100%" height="100%" theme="light">
          <Tooltip trigger="item" formatValue={(v) => formatNumber(v)} />
          <Pie
            radius={['85%', '96%']}
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
                  name={STATUS_LABELS[s.name] ?? s.name}
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
    </>
  );
}
