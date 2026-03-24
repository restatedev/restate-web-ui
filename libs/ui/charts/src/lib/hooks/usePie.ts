import { useMemo, type RefObject } from 'react';
import type { PieConfig } from '../types';
import type { PieSeriesOption } from 'echarts/charts';
import type { CustomSeriesOption } from 'echarts/charts';
import type { EChartsType } from 'echarts/core';

const HIGHLIGHT_STROKE = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: 'rgba(255,255,255,0.7)' },
    { offset: 0.5, color: 'rgba(255,255,255,0.35)' },
    { offset: 1, color: 'rgba(255,255,255,0.05)' },
  ],
} as unknown as string;

export function usePie(
  pieCfg: PieConfig | undefined,
  chartRef?: RefObject<EChartsType | null>,
): (PieSeriesOption | CustomSeriesOption)[] | undefined {
  return useMemo(() => {
    if (!pieCfg) return undefined;

    const pie: PieSeriesOption = {
      type: 'pie',
      animationDuration: 0,
      radius: pieCfg.radius,
      center: pieCfg.center,
      startAngle: pieCfg.startAngle,
      endAngle: pieCfg.endAngle,
      padAngle: pieCfg.padAngle,
      minAngle: pieCfg.minAngle,
      silent: pieCfg.silent,
      label: { show: pieCfg.showLabel ?? true },
      labelLine: { show: pieCfg.showLabel ?? true },
      data: pieCfg.slices.map((slice) => ({
        name: slice.name,
        value: slice.value,
        itemStyle: {
          color: slice.color,
          borderColor: slice.borderColor,
          borderWidth: slice.borderWidth,
          borderType: slice.borderType,
          borderCap: slice.borderCap,
          borderRadius: slice.borderRadius,
          shadowBlur: slice.shadowBlur,
          shadowColor: slice.shadowColor,
          shadowOffsetY: slice.shadowOffsetY,
        },
      })),
    };

    if (!pieCfg.gradient || !chartRef) return [pie];

    const inset = pieCfg.slices[0]?.borderWidth ?? 2;
    const scaleSize = 5;

    const highlight: CustomSeriesOption = {
      type: 'custom',
      coordinateSystem: 'none',
      data: pieCfg.slices.map((_s, i) => [i]),
      z: 10,
      silent: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderItem(params: any) {
        const instance = chartRef?.current;
        if (!instance) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = (instance as any).getModel?.();
        const pieSeries = model?.getSeriesByIndex?.(0);
        const pieData = pieSeries?.getData?.();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layout = pieData?.getItemLayout?.(params.dataIndex) as any;
        if (!layout) return;

        const midR = (layout.r + layout.r0) / 2;
        const angInset = midR > 0 ? inset / midR : 0;
        const cr = Math.max(0, (layout.borderRadius ?? 6) - inset);

        const baseShape = {
          cx: layout.cx,
          cy: layout.cy,
          r: layout.r - inset,
          r0: layout.r0 + inset,
          startAngle: layout.startAngle + angInset,
          endAngle: layout.endAngle - angInset,
          cornerRadius: cr,
        };

        const emphShape = {
          ...baseShape,
          r: layout.r - inset + scaleSize,
        };

        return {
          type: 'group' as const,
          id: `highlight-group-${params.dataIndex}`,
          children: [
            {
              type: 'sector' as const,
              shape: baseShape,
              id: `highlight-${params.dataIndex}`,
              style: {
                fill: 'transparent',
                stroke: HIGHLIGHT_STROKE,
                lineWidth: 1,
                opacity: 1,
                transition: ['opacity'],
              },
              emphasis: {
                style: { opacity: 0 },
              },
            },
            {
              type: 'sector' as const,
              shape: emphShape,
              id: `highlight-emphasis-${params.dataIndex}`,
              style: {
                fill: 'transparent',
                stroke: HIGHLIGHT_STROKE,
                lineWidth: 1,
                opacity: 0,
                transition: ['opacity'],
              },
              emphasis: {
                style: { opacity: 1 },
              },
            },
          ],
        };
      },
    };

    return [pie, highlight];
  }, [pieCfg, chartRef]);
}
