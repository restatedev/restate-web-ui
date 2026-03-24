import { useMemo, useRef, useImperativeHandle } from 'react';
import type { EChartsType } from 'echarts/core';
import type { ChartProps, ECOption } from './types';
import { buildConfigFromChildren } from './configParser';
import { useSeries } from './hooks/useSeries';
import { useTooltip } from './hooks/useTooltip';
import { useAxes } from './hooks/useAxes';
import { useMarkLines } from './hooks/useMarkLines';
import { useDatasetSource } from './hooks/useDatasetSource';
import { useEchartsInit } from './hooks/useEchartsInit';
import { useApplyOption } from './hooks/useApplyOption';
import { usePie } from './hooks/usePie';
import invariant from 'tiny-invariant';

export function Chart<T extends object>({
  data,
  width = '100%',
  height = '100%',
  style,
  className,
  theme = 'light',
  timeZone = 'system',
  children,
  ref,
}: ChartProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const parsed = buildConfigFromChildren<T>(children);
  const isPie = Boolean(parsed.pie);

  if (!isPie) {
    invariant(parsed.xAxis, 'Missing XAxis');
  }

  const xType = parsed.xAxis?.type ?? 'category';
  const resolvedXKey = parsed.xAxis?.dataKey;

  const datasetSource = useDatasetSource(data ?? [], resolvedXKey, xType);
  const series = useSeries<T>(parsed, resolvedXKey);
  const tooltip = useTooltip(parsed.tooltip, xType, timeZone);
  const { xAxis, yAxis, grid } = useAxes(
    parsed.xAxis ?? { type: 'category', dataKey: '' as any },
    parsed.yAxis,
    xType,
    parsed.grid,
  );
  const markLines = useMarkLines(parsed.refLines, xType);
  const echartsInstanceRef = useRef<EChartsType | null>(null);
  const pieSeries = usePie(parsed.pie, echartsInstanceRef);

  const option: ECOption = useMemo(() => {
    if (pieSeries) {
      return {
        animation: true,
        tooltip,
        legend: parsed.legend,
        series: pieSeries,
      };
    }

    return {
      animation: true,
      dataset: [{ id: 'main', source: datasetSource }],
      color: '#51a2ff',
      grid,
      tooltip,
      xAxis,
      yAxis,
      series: series?.map((s) =>
        markLines ? { ...s, markLine: markLines } : s,
      ),
    };
  }, [
    pieSeries,
    datasetSource,
    grid,
    tooltip,
    xAxis,
    yAxis,
    series,
    markLines,
    parsed.legend,
  ]);

  const chartRef = useEchartsInit(containerRef, theme);
  echartsInstanceRef.current = chartRef.current;
  useApplyOption(chartRef, option);

  useImperativeHandle(ref, () => ({
    getInstance: () => chartRef.current,
    setOption: (chartOptions, setOptions) =>
      chartRef.current?.setOption(chartOptions, setOptions),
    resize: () => chartRef.current?.resize(),
  }));

  if (typeof window === 'undefined')
    return <div style={{ width, height }} className={className} />;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, ...style }}
    />
  );
}
