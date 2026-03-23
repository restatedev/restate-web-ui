/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { EChartsType, SetOptionOpts, ComposeOption } from 'echarts/core';
import type { BarSeriesOption, CustomSeriesOption } from 'echarts/charts';
import type {
  GridComponentOption,
  DatasetComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
} from 'echarts/components';
import type { CSSProperties, ReactNode, Ref } from 'react';
import type { XAXisOption, YAXisOption } from 'echarts/types/dist/shared';

export type AxisType = 'time' | 'value' | 'category';
export type SeriesKind = 'bar' | string;

export type AxisConfig<T extends object> = {
  id?: string;
  type: AxisType;
  show?: boolean;
  labelFormatter?: (value: number) => string;
  min?: number;
  max?: number;
  dataKey: Exclude<keyof T, number | symbol>;
};

export interface XAxisConfig<T extends object> extends AxisConfig<T> {
  position?: 'top' | 'bottom';
}
export interface YAxisConfig<T extends object>
  extends Omit<AxisConfig<T>, 'dataKey'> {
  position?: 'left' | 'right';
  dataKey?: Exclude<keyof T, number | symbol>;
}

export type GridConfig = {
  show?: boolean;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
};
export type TooltipConfig = {
  show?: boolean;
  trigger?: 'axis' | 'item';
  formatRange?: (start: Date, end: Date, timeZone: 'system' | 'UTC') => string;
  formatValue?: (value: number) => string;
};
export type LegendConfig = {
  // show?: boolean;
  // top?: number | string;
  // left?: number | string;
};
export type RefLineConfig = {
  x?: number | string | Date;
  y?: number | string;
  name?: string;
  dashed?: boolean;
};

export type BaseSeriesCfg = {
  id?: string;
  name?: string;
  type: SeriesKind;
  xKey?: string;
  xAxisId?: string;
  yAxisIndex?: number;
};
export type BarSeriesCfg = BaseSeriesCfg & {
  type: 'bar';
  dataKey: string;
  barWidth?: number | string;
  stack?: string;
};
export type BarTimeSeriesCfg = BaseSeriesCfg & {
  type: 'bar-time';
  dataKey: string;
  startRangeKey: string;
  endRangeKey: string;
  barWidth?: number | string;
  stack?: string;
};
export type AnySeriesCfg = BarSeriesCfg | BarTimeSeriesCfg | BaseSeriesCfg;

export type ChartConfig<T extends object> = {
  xAxis?: XAxisConfig<T>;
  yAxis?: YAxisConfig<T>;
  grid?: GridConfig;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
  series: AnySeriesCfg[];
  refLines: RefLineConfig[];
};

export type ChartProps<T extends object> = {
  data: T[];
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
  theme?: 'light' | 'dark';
  timeZone?: 'system' | 'UTC';
  children: ReactNode;
  ref?: Ref<ChartHandle>;
};

export type ChartHandle = {
  getInstance: () => EChartsType | null;
  setOption: (opt: ECOption, opts?: SetOptionOpts) => void;
  resize: () => void;
};

export type ECOption = ComposeOption<
  | BarSeriesOption
  | CustomSeriesOption
  | GridComponentOption
  | DatasetComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
>;

export type AxX = XAXisOption;
export type AxY = YAXisOption;
