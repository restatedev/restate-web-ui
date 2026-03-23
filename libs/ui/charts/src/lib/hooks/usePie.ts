import { useMemo } from 'react';
import type { PieConfig } from '../types';
import type { PieSeriesOption } from 'echarts/charts';

export function usePie(
  pieCfg: PieConfig | undefined,
): PieSeriesOption | undefined {
  return useMemo(() => {
    if (!pieCfg) return undefined;

    return {
      type: 'pie',
      radius: pieCfg.radius,
      center: pieCfg.center,
      startAngle: pieCfg.startAngle,
      endAngle: pieCfg.endAngle,
      data: pieCfg.slices.map((slice) => ({
        name: slice.name,
        value: slice.value,
        itemStyle: {
          color: slice.color,
          borderColor: slice.borderColor,
          borderWidth: slice.borderWidth,
          borderRadius: slice.borderRadius,
        },
      })),
    };
  }, [pieCfg]);
}
