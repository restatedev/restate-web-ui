import { useMemo } from 'react';
import type { AxisType, GridConfig, AxX, AxY, ChartConfig } from '../types';

export function useAxes<T extends object>(
  xAxisCfg: NonNullable<ChartConfig<T>['xAxis']>,
  yAxisCfg: ChartConfig<T>['yAxis'],
  xType: AxisType,
  gridCfg: GridConfig | undefined,
): { xAxis: AxX; yAxis: AxY; grid: GridConfig } {
  const grid = useMemo(() => {
    return {
      show: false,
      top: gridCfg?.top,
      bottom: gridCfg?.bottom,
      left: gridCfg?.left,
      right: gridCfg?.right,
    };
  }, [gridCfg?.bottom, gridCfg?.left, gridCfg?.right, gridCfg?.top]);
  const xAxis = useMemo<AxX>(() => {
    const axis: AxX = {
      id: 'x',
      type: xType,
      show: xAxisCfg?.show,
      position: xAxisCfg?.position,
      axisLabel: {
        fontFamily: 'InterVariable, sans-serif',
        color: 'oklch(55.1% .027 264.364)',
      },
      axisLine: {
        lineStyle: {
          color: 'oklch(92.8% .006 264.531)',
          type: 'solid',
          width: 2,
        },
      },
    };
    if (xType === 'time' || xType === 'value') {
      axis.min = xAxisCfg.min;
      axis.max = xAxisCfg.max;
      axis.boundaryGap = false;
      axis.axisLabel!.hideOverlap = true;
      axis.axisLabel!.formatter = {
        year: '{yyyy}',
        month: '{d} {MMM}',
        day: '{d} {MMM}',
        hour: '{hh}:{mm} {A}',
        minute: '{hh}:{mm}',
        second: '{hh}:{mm}:{ss}',
        millisecond: '{hh}:{mm}:{ss} {SSS}',
      };
    }

    return axis as AxX;
  }, [xAxisCfg.max, xAxisCfg.min, xAxisCfg?.position, xAxisCfg?.show, xType]);

  const yAxis = useMemo<AxY>(() => {
    const axis: AxY = {
      id: 'y',
      type: (yAxisCfg?.type as AxisType) || 'value',
      show: yAxisCfg?.show,
      position: yAxisCfg?.position,
      axisLabel: {
        fontFamily: 'InterVariable, sans-serif',
        color: 'oklch(55.1% .027 264.364)',
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: 'rgba(0,0,0,0.1)',
        },
      },
      splitNumber: 2,
    };
    if (axis.type === 'value') {
      axis.min = yAxisCfg?.min;
      axis.max = yAxisCfg?.max;
      axis.axisLabel!.formatter = yAxisCfg?.labelFormatter;
    }
    return axis as AxY;
  }, [
    yAxisCfg?.type,
    yAxisCfg?.show,
    yAxisCfg?.position,
    yAxisCfg?.min,
    yAxisCfg?.max,
    yAxisCfg?.labelFormatter,
  ]);

  return { xAxis, yAxis, grid };
}
