import { useMemo, type RefObject } from 'react';
import type { PieConfig } from '../types';
import type { PieSeriesOption } from 'echarts/charts';
import type { CustomSeriesOption } from 'echarts/charts';
import type { EChartsType } from 'echarts/core';
import { hoverColor } from '../hoverColor';

const highlight = (percent: number) =>
  `color-mix(in oklab, var(--box-shadow-color-highlight) ${percent}%, transparent)`;

const HIGHLIGHT_STROKE = {
  type: 'linear',
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: highlight(70) },
    { offset: 0.5, color: highlight(35) },
    { offset: 1, color: highlight(5) },
  ],
} as unknown as string;

const HATCH_SPACING = 6;
const HATCH_WIDTH = 2;

function hatchLines(
  shape: { cx: number; cy: number; r: number },
  color: string,
  id: string,
) {
  const step = HATCH_SPACING * Math.SQRT2;
  const left = shape.cx - shape.r;
  const right = shape.cx + shape.r;
  const min = left + shape.cy - shape.r;
  const max = right + shape.cy + shape.r;
  const lines = [];
  for (let c = min; c <= max; c += step) {
    lines.push({
      type: 'line' as const,
      id: `${id}-${lines.length}`,
      shape: { x1: left, y1: c - left, x2: right, y2: c - right },
      style: { stroke: color, lineWidth: HATCH_WIDTH },
    });
  }
  return lines;
}

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
      cursor: pieCfg.slices.some((slice) => slice.onSelect)
        ? 'pointer'
        : undefined,
      label: { show: pieCfg.showLabel ?? true },
      labelLine: { show: pieCfg.showLabel ?? true },
      data: pieCfg.slices.map((slice) => {
        const itemStyle = {
          color: slice.color,
          borderColor: slice.borderColor,
          borderWidth: slice.borderWidth,
          borderType: slice.borderType,
          borderCap: slice.borderCap,
          borderRadius: slice.borderRadius,
          shadowBlur: slice.shadowBlur,
          shadowColor: slice.shadowColor,
          shadowOffsetY: slice.shadowOffsetY,
        };
        return {
          name: slice.name,
          value: slice.value,
          itemStyle,
          ...(slice.color && {
            emphasis: {
              itemStyle: { ...itemStyle, color: hoverColor(slice.color) },
            },
          }),
        };
      }),
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

        const hatchColor = pieCfg.slices[params.dataIndex]?.hatchColor;
        const hatchId = `hatch-${params.dataIndex}`;

        return {
          type: 'group' as const,
          id: `highlight-group-${params.dataIndex}`,
          children: [
            ...(hatchColor
              ? [
                  {
                    type: 'group' as const,
                    id: hatchId,
                    clipPath: { type: 'sector' as const, shape: baseShape },
                    children: hatchLines(baseShape, hatchColor, hatchId),
                  },
                ]
              : []),
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
