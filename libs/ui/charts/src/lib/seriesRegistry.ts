import type {
  ECOption,
  AnySeriesCfg,
  BarSeriesCfg,
  BarTimeSeriesCfg,
} from './types';
import type { BarSeriesOption } from 'echarts/charts';

export type SeriesBuildCtx = { resolvedXKey: string };
export type SeriesBuilder = (
  cfg: AnySeriesCfg,
  ctx: SeriesBuildCtx,
) => Exclude<ECOption['series'], undefined | any[]>;

export const seriesBuilders: Record<'bar' | 'bar-time', SeriesBuilder> = {
  bar: (cfg: AnySeriesCfg, { resolvedXKey }) => {
    const series = cfg as BarSeriesCfg;
    const id = series.id || series.name || series.dataKey;
    const xKey = series.xKey || resolvedXKey;
    const bar: BarSeriesOption = {
      id,
      name: series.name || series.dataKey || id,
      type: 'bar',
      encode: { x: xKey, y: series.dataKey },
      yAxisIndex: series.yAxisIndex,
      barWidth: series.barWidth,
      barCategoryGap: '0%',
    };
    if (series.stack) {
      bar.stack = series.stack;
    }
    return bar;
  },
  'bar-time': (cfg: AnySeriesCfg, { resolvedXKey }) => {
    const series = cfg as BarTimeSeriesCfg;

    return {
      type: 'custom',
      encode: {
        x: [series.startRangeKey, series.endRangeKey],
        y: series.dataKey,
      },
      selectedMode: 'single',
      clip: true,

      renderItem(params, api) {
        const start = api.value(series.startRangeKey);
        const end = api.value(series.endRangeKey);
        const val = api.value(series.dataKey);
        const capH = 3;

        const x0 = Number(api.coord([start, 0])[0]);
        const x1 = Number(api.coord([end, 0])[0]);
        const hasValue = typeof val === 'number' && !isNaN(val);
        const y0 = Number(api.coord([start, 0])[1]);
        let y1 = hasValue ? Number(api.coord([start, val])[1]) : y0;
        if (y0 === y1) {
          y1 -= capH;
        }

        const width = x1 - x0;
        const height = y0 - y1;

        if (width <= 0 || height <= 0) return;

        const color = hasValue ? api.visual('color') : 'rgba(0,0,0,0.1)';
        const gap = width > 20 ? 1 : 0.25;
        const radius = width > 20 ? 2 : 1;

        return {
          type: 'group',

          children: [
            {
              type: 'rect',
              shape: {
                x: x0 + gap,
                y: 0,
                width: width - 2 * gap,
                height:
                  'height' in params.coordSys
                    ? Number(params.coordSys.height)
                    : 0,
                r: radius,
              },
              style: { fill: 'rgba(0,0,0,0)' },
            },
            {
              type: 'line',
              transition: ['shape'],
              shape: {
                x1: x0 + gap + width / 2 - 1 / 2,
                x2: x0 + gap + width / 2 - 1 / 2,
                y1: 0,
                y2:
                  'height' in params.coordSys
                    ? Number(params.coordSys.height)
                    : 0,
              },
              style: {
                stroke: '#000',
                lineWidth: 1,
                lineDash: [4, 2],
                opacity: 0,
              },
              emphasis: { style: { opacity: 0.15 } },
            },
            {
              type: 'rect',
              transition: ['shape'],
              enterFrom: {
                shape: { x: x0 + gap, y: y0, height: 0 },
                style: { opacity: 0 },
              },
              leaveTo: {
                shape: { x: x0 + gap, y: y0, height: 0 },
                style: { opacity: 0 },
              },
              shape: {
                x: x0 + gap,
                y: y1,
                width: width - 2 * gap,
                height: height,
                r: radius,
              },
              style: { fill: color, opacity: 0.35, lineWidth: 0 },
              emphasis: { style: { opacity: 0.75 } },
            },
            {
              type: 'rect',
              transition: ['shape'],
              enterFrom: {
                shape: { x: x0 + gap, y: y0, height: capH },
                style: { opacity: 0 },
              },
              leaveTo: {
                shape: { x: x0 + gap, y: y0, height: capH },
                style: { opacity: 0 },
              },
              shape: {
                x: x0 + gap,
                y: y1,
                width: width - 2 * gap,
                height: capH,
                r: radius,
              },
              style: {
                fill: color,
                opacity: 1,
                lineWidth: 0,
              },
            },
          ],
        };
      },
    };
  },
};
