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
    if (series.color) {
      bar.itemStyle = { color: series.color };
    }
    if (series.stack) {
      bar.stack = series.stack;
    }
    return bar;
  },
  'bar-time': (cfg: AnySeriesCfg, { resolvedXKey }) => {
    const series = cfg as BarTimeSeriesCfg;
    const id = series.id || series.name || series.dataKey;

    return {
      id,
      name: series.name || series.dataKey || id,
      type: 'custom',
      ...(series.color ? { itemStyle: { color: series.color } } : {}),
      encode: {
        x: [series.startRangeKey, series.endRangeKey],
        y: series.dataKey,
      },
      selectedMode: 'single',
      clip: true,
      cursor: series.cursor ?? (series.onSelect ? 'pointer' : undefined),

      renderItem(params, api) {
        const start = api.value(series.startRangeKey);
        const end = api.value(series.endRangeKey);
        const val = api.value(series.dataKey);
        const minH = series.minBarHeight ?? 4;

        const x0 = Number(api.coord([start, 0])[0]);
        const x1 = Number(api.coord([end, 0])[0]);
        const hasValue = typeof val === 'number' && !isNaN(val);
        const down = hasValue && (Number(val) < 0 || Object.is(val, -0));
        const y0 = Number(api.coord([start, 0])[1]);
        const yv = hasValue ? Number(api.coord([start, val])[1]) : y0;
        const coordY = 'y' in params.coordSys ? Number(params.coordSys.y) : 0;
        const coordHeight =
          'height' in params.coordSys ? Number(params.coordSys.height) : 0;
        const coordBottom = coordY + coordHeight;
        const baselineEdgeGap = series.minBaselineEdgeGap ?? 0;
        const effectiveBaselineEdgeGap = Math.min(
          baselineEdgeGap,
          coordHeight / 2,
        );
        const yBase =
          effectiveBaselineEdgeGap > 0
            ? Math.min(
                Math.max(y0, coordY + effectiveBaselineEdgeGap),
                coordBottom - effectiveBaselineEdgeGap,
              )
            : y0;

        const width = x1 - x0;
        const gap = series.gap ?? (width > 20 ? 1 : 0.25);
        const baselineGap = series.baselineGap ?? 0;
        const barWidth =
          typeof series.barWidth === 'number'
            ? Math.min(width, series.barWidth)
            : width - 2 * gap;
        const baseline = down ? yBase + baselineGap : yBase - baselineGap;
        const directionDistance = down ? yv - baseline : baseline - yv;
        const height = Math.max(minH, Math.max(0, directionDistance));
        const top = down ? baseline : baseline - height;

        if (barWidth <= 0 || height <= 0) return;

        const fill = hasValue
          ? (series.fillColor ?? series.color ?? api.visual('color'))
          : 'rgba(0,0,0,0.1)';
        const stroke = hasValue
          ? (series.color ?? api.visual('color'))
          : 'rgba(0,0,0,0.1)';
        const x = x0 + (width - barWidth) / 2;
        const radius = Math.min(5, barWidth / 2, height / 2);
        const cx = x + barWidth / 2;
        const isLive =
          series.liveIndex != null && params.dataIndex === series.liveIndex;
        const opacity = isLive ? 1 : 0.92;
        const liveFillOpacity = 0.62;
        const shadowColor = down
          ? 'rgba(239,68,68,0.18)'
          : 'rgba(34,197,94,0.16)';
        const segmentShape = {
          x,
          y: top,
          width: barWidth,
          height,
          r: radius,
        };
        const highlightY = down ? top + height - 1.25 : top + 1.25;
        const highlightShape = {
          x1: x + radius,
          x2: x + barWidth - radius,
          y1: highlightY,
          y2: highlightY,
        };
        const liveFillStartShape = {
          x,
          y: down ? top : top + height,
          width: barWidth,
          height: 0,
          r: radius,
        };
        const liveFillEndShape = {
          x,
          y: top,
          width: barWidth,
          height,
          r: radius,
        };
        const hitAreaShape = {
          x,
          y: down ? yBase : coordY,
          width: barWidth,
          height: down
            ? Math.max(0, coordBottom - yBase)
            : Math.max(0, yBase - coordY),
          r: radius,
        };

        return {
          type: 'group',
          $mergeChildren: 'byName',

          children: [
            {
              type: 'rect',
              name: 'hit-area',
              shape: hitAreaShape,
              style: { fill: 'rgba(0,0,0,0)' },
            },
            {
              type: 'line',
              name: 'hover-line',
              transition: ['shape'],
              shape: {
                x1: cx,
                x2: cx,
                y1: coordY,
                y2: coordBottom,
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
              name: 'segment',
              enterFrom: {
                shape: { x, y: baseline, height: 0 },
                style: { opacity: 0 },
              },
              leaveTo: {
                shape: { x, y: baseline, height: 0 },
                style: { opacity: 0 },
              },
              shape: { ...segmentShape, transition: ['y', 'height'] },
              style: {
                fill,
                stroke,
                lineWidth: 1.25,
                opacity,
                shadowBlur: 2,
                shadowColor,
                shadowOffsetY: 1,
              },
              emphasis: {
                style: { fill: stroke, opacity: 1, shadowBlur: 4 },
              },
            },
            ...(isLive
              ? [
                  {
                    type: 'rect' as const,
                    name: 'live-fill',
                    shape: liveFillStartShape,
                    style: {
                      fill: stroke,
                      opacity: liveFillOpacity,
                      lineWidth: 0,
                    },
                    emphasis: { style: { opacity: 0 } },
                    keyframeAnimation: {
                      duration: 1800,
                      loop: true,
                      keyframes: [
                        {
                          percent: 0,
                          shape: liveFillStartShape,
                          style: { opacity: liveFillOpacity },
                        },
                        {
                          percent: 0.72,
                          shape: liveFillEndShape,
                          style: { opacity: liveFillOpacity },
                        },
                        {
                          percent: 1,
                          shape: liveFillEndShape,
                          style: { opacity: 0 },
                        },
                      ],
                    },
                  },
                ]
              : []),
            {
              type: 'line',
              name: 'highlight',
              shape: { ...highlightShape, transition: ['y1', 'y2'] },
              style: {
                stroke: 'rgba(255,255,255,0.55)',
                lineCap: 'round',
                lineWidth: 1,
                opacity: 1,
              },
            },
          ],
        };
      },
    };
  },
};
