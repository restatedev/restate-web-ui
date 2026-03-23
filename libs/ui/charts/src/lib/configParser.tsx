import {
  Children,
  ComponentProps,
  ComponentType,
  isValidElement,
  ReactElement,
  ReactNode,
} from 'react';

import type { AnySeriesCfg, BarTimeSeriesCfg, ChartConfig } from './types';

export function XAxis<T extends object>(props: ChartConfig<T>['xAxis']) {
  return null;
}
export function TimeXAxis<T extends object>(
  props: Pick<NonNullable<ChartConfig<T>['xAxis']>, 'dataKey' | 'min' | 'max'>,
) {
  return null;
}
export function YAxis<T extends object>(props: ChartConfig<T>['yAxis']) {
  return null;
}
export function ValueYAxis<T extends object>(
  props: Pick<
    NonNullable<ChartConfig<T>['yAxis']>,
    'dataKey' | 'position' | 'labelFormatter' | 'min' | 'max'
  >,
) {
  return null;
}
export function Tooltip<T extends object>(props: ChartConfig<T>['tooltip']) {
  return null;
}
export function Legend<T extends object>(props: ChartConfig<T>['legend']) {
  return null;
}
export function CartesianGrid<T extends object>(
  props: Pick<
    NonNullable<ChartConfig<T>['grid']>,
    'top' | 'left' | 'bottom' | 'right'
  >,
) {
  return null;
}
export function ReferenceLine<T extends object>(
  props: ChartConfig<T>['refLines'][number],
) {
  return null;
}
export function Series<T extends object>(
  props: ChartConfig<T>['series'][number],
) {
  return null;
}
export function BarTimeSeries<T extends object>(
  props: Pick<BarTimeSeriesCfg, 'dataKey' | 'startRangeKey' | 'endRangeKey'>,
) {
  return null;
}

function componentGuardFactory<C extends ComponentType<any>>(component: C) {
  return (ch: ReactElement): ch is ReactElement<ComponentProps<C>, C> => {
    return ch.type === component;
  };
}

const isTimeXAxis = componentGuardFactory(TimeXAxis);
const isValueYAxis = componentGuardFactory(ValueYAxis);
const isXAxis = componentGuardFactory(XAxis);
const isYAxis = componentGuardFactory(YAxis);
const isTooltip = componentGuardFactory(Tooltip);
const isLegend = componentGuardFactory(Legend);
const isCartesianGrid = componentGuardFactory(CartesianGrid);
const isReferenceLine = componentGuardFactory(ReferenceLine);
const isSeries = componentGuardFactory(Series);
const isBarTimeSeries = componentGuardFactory(BarTimeSeries);

export function buildConfigFromChildren<T extends object>(
  children: ReactNode,
): ChartConfig<T> {
  const cfg: ChartConfig<T> = {
    series: [],
    refLines: [],
    legend: { show: false },
  };

  Children.forEach(children, (ch) => {
    if (!isValidElement(ch)) return;
    if (isXAxis(ch)) {
      const resolveConfig = { ...cfg.xAxis, ...ch.props, show: true };
      if (!resolveConfig?.type || !resolveConfig?.dataKey) {
        throw new Error('<XAxis type="..." dataKey="..."> is required.');
      }
      cfg.xAxis = {
        ...resolveConfig,
        type: resolveConfig.type,
        dataKey: resolveConfig.dataKey as Exclude<keyof T, number | symbol>,
      };
    }
    if (isTimeXAxis(ch)) {
      const resolveConfig = { ...cfg.xAxis, ...ch.props, show: true };
      if (!resolveConfig?.dataKey) {
        throw new Error('<TimeXAxis dataKey="..."> is required.');
      }
      cfg.xAxis = {
        ...resolveConfig,
        type: 'time',
        dataKey: resolveConfig.dataKey as Exclude<keyof T, number | symbol>,
      };
    }
    if (isYAxis(ch)) {
      const resolveConfig = { ...cfg.yAxis, ...ch.props };
      if (!resolveConfig?.type) {
        throw new Error('<YAxis type="..." dataKey="..."> is required.');
      }
      cfg.yAxis = {
        ...resolveConfig,
        type: resolveConfig.type,
        dataKey: resolveConfig.dataKey as Exclude<keyof T, number | symbol>,
      };
    }
    if (isValueYAxis(ch)) {
      const resolveConfig = { ...cfg.yAxis, ...ch.props, show: true };
      cfg.yAxis = {
        ...resolveConfig,
        type: 'value',
        dataKey: resolveConfig.dataKey as Exclude<keyof T, number | symbol>,
      };
    }
    if (isTooltip(ch)) {
      cfg.tooltip = { ...cfg.tooltip, ...ch.props };
    }
    if (isLegend(ch)) {
      cfg.legend = { ...cfg.legend, ...ch.props, show: true };
    }
    if (isCartesianGrid(ch)) {
      cfg.grid = { ...cfg.grid, ...ch.props, show: true };
    }
    if (isReferenceLine(ch)) {
      cfg.refLines.push({ ...ch.props });
    }
    if (isSeries(ch)) {
      cfg.series.push({
        ...(ch.props as AnySeriesCfg),
      });
    }
    if (isBarTimeSeries(ch)) {
      cfg.series.push({
        ...(ch.props as AnySeriesCfg),
        type: 'bar-time',
      });
    }
  });

  return cfg;
}
