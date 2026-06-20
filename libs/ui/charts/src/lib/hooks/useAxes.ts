import { useMemo } from 'react';
import type { AxisType, GridConfig, AxX, AxY, ChartConfig } from '../types';

export function useAxes<T extends object>(
  xAxisCfg: NonNullable<ChartConfig<T>['xAxis']>,
  yAxisCfg: ChartConfig<T>['yAxis'],
  xType: AxisType,
  gridCfg: GridConfig | undefined,
): { xAxis: AxX; yAxis: AxY; grid: GridConfig } {
  const yAxisType = yAxisCfg?.type;
  const yAxisShow = yAxisCfg?.show;
  const yAxisPosition = yAxisCfg?.position;
  const yAxisMin = yAxisCfg?.min;
  const yAxisMax = yAxisCfg?.max;
  const yAxisInterval = yAxisCfg?.interval;
  const yAxisSplitLine = yAxisCfg?.splitLine;
  const yAxisVisibleValues = yAxisCfg?.visibleValues;
  const yAxisLabelFormatter = yAxisCfg?.labelFormatter;
  const yAxisLabelInside = yAxisCfg?.labelInside;

  const grid = useMemo(() => {
    return {
      show: false,
      containLabel: gridCfg?.containLabel,
      top: gridCfg?.top,
      bottom: gridCfg?.bottom,
      left: gridCfg?.left,
      right: gridCfg?.right,
    };
  }, [
    gridCfg?.bottom,
    gridCfg?.containLabel,
    gridCfg?.left,
    gridCfg?.right,
    gridCfg?.top,
  ]);
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
    const visibleValues = yAxisVisibleValues;
    const isVisibleValue = (value: number) =>
      Boolean(
        visibleValues?.some(
          (visibleValue) => Math.abs(value - visibleValue) < 1,
        ),
      );
    const axis: AxY = {
      id: 'y',
      type: (yAxisType as AxisType) || 'value',
      show: yAxisShow,
      position: yAxisPosition,
      axisLabel: {
        fontFamily: 'InterVariable, sans-serif',
        color: 'oklch(55.1% .027 264.364)',
        align: yAxisLabelInside
          ? yAxisPosition === 'right'
            ? 'right'
            : 'left'
          : yAxisPosition === 'right'
            ? 'left'
            : 'right',
        hideOverlap: true,
        inside: yAxisLabelInside ?? false,
        margin: yAxisLabelInside ? 0 : 12,
      },
      splitLine: {
        show: yAxisSplitLine ?? true,
        lineStyle: {
          type: 'dashed',
          color: 'rgba(0,0,0,0.1)',
        },
      },
      splitNumber: 2,
    };
    if (axis.type === 'value') {
      axis.min = yAxisMin;
      axis.max = yAxisMax;
      axis.interval = yAxisInterval;
      const axisLabel = axis.axisLabel;
      const splitLine = axis.splitLine;
      if (axisLabel) {
        axisLabel.formatter = (value: number) => {
          if (visibleValues?.length && !isVisibleValue(value)) return '';
          return yAxisLabelFormatter?.(value) ?? `${value}`;
        };
      }
      if (visibleValues?.length && splitLine) {
        splitLine.show = yAxisSplitLine ?? false;
      }
    }
    return axis as AxY;
  }, [
    yAxisType,
    yAxisShow,
    yAxisPosition,
    yAxisMin,
    yAxisMax,
    yAxisInterval,
    yAxisSplitLine,
    yAxisVisibleValues,
    yAxisLabelFormatter,
    yAxisLabelInside,
  ]);

  return { xAxis, yAxis, grid };
}
