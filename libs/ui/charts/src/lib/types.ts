/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {
  EChartsType,
  SetOptionOpts,
  ComposeOption,
  ECElementEvent,
} from 'echarts/core';
import type {
  BarSeriesOption,
  CustomSeriesOption,
  PieSeriesOption,
} from 'echarts/charts';
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
  visibleValues?: number[];
  dataKey: Exclude<keyof T, number | symbol>;
};

export interface XAxisConfig<T extends object> extends AxisConfig<T> {
  position?: 'top' | 'bottom';
}
export interface YAxisConfig<T extends object> extends Omit<
  AxisConfig<T>,
  'dataKey'
> {
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
export type TooltipSeries = {
  dataKey: string;
  label?: string;
  color?: string;
};
export type TooltipConfig = {
  show?: boolean;
  trigger?: 'axis' | 'item';
  formatRange?: (start: Date, end: Date, timeZone: 'system' | 'UTC') => string;
  formatValue?: (value: number) => string;
  series?: TooltipSeries[];
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

export type SliceSelectEvent = {
  name: string;
  value: number;
  dataIndex: number;
  event: ECElementEvent;
  chart: EChartsType;
};
export type SliceSelectHandler = (event: SliceSelectEvent) => void;

export type BarTimeSeriesSelectEvent<T extends object = object> = {
  data: T;
  dataIndex: number;
  start: Date;
  end: Date;
  value: unknown;
  event: ECElementEvent;
  chart: EChartsType;
};
export type BarTimeSeriesSelectHandler<T extends object = object> = (
  event: BarTimeSeriesSelectEvent<T>,
) => void;

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
  color?: string;
};
export type BarTimeSeriesCfg<T extends object = object> = BaseSeriesCfg & {
  type: 'bar-time';
  dataKey: string;
  startRangeKey: string;
  endRangeKey: string;
  barWidth?: number | string;
  stack?: string;
  color?: string;
  fillColor?: string;
  gap?: number;
  baselineGap?: number;
  cursor?: string;
  liveIndex?: number;
  onSelect?: BarTimeSeriesSelectHandler<T>;
};
export type AnySeriesCfg<T extends object = object> =
  | BarSeriesCfg
  | BarTimeSeriesCfg<T>
  | BaseSeriesCfg;

export type SliceConfig = {
  name: string;
  value: number;
  color?: string;
  colorLight?: string;
  colorDark?: string;
  borderColor?: string;
  borderWidth?: number;
  borderType?: 'solid' | 'dashed' | 'dotted' | number[];
  borderCap?: 'butt' | 'round' | 'square';
  borderRadius?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetY?: number;
  onSelect?: SliceSelectHandler;
};

export type PieConfig = {
  radius?: string | [string, string];
  center?: [string, string];
  startAngle?: number;
  endAngle?: number;
  padAngle?: number;
  minAngle?: number;
  showLabel?: boolean;
  silent?: boolean;
  gradient?: boolean;
  slices: SliceConfig[];
};

export type ChartConfig<T extends object> = {
  xAxis?: XAxisConfig<T>;
  yAxis?: YAxisConfig<T>;
  grid?: GridConfig;
  tooltip?: TooltipConfig;
  legend?: LegendConfig;
  series: AnySeriesCfg<T>[];
  refLines: RefLineConfig[];
  pie?: PieConfig;
};

export type ChartProps<T extends object> = {
  data?: T[];
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
  theme?: 'light' | 'dark';
  timeZone?: 'system' | 'UTC';
  renderer?: 'canvas' | 'svg';
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
  | PieSeriesOption
  | GridComponentOption
  | DatasetComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
>;

export type AxX = XAXisOption;
export type AxY = YAXisOption;
