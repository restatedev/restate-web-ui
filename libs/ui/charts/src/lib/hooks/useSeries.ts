import { useMemo } from 'react';
import type { ChartConfig, ECOption } from '../types';
import { seriesBuilders, type SeriesBuildCtx } from '../seriesRegistry';

function isSeries(
  arr: ECOption['series'],
): arr is NonNullable<ECOption['series']> {
  return Boolean(arr);
}

export function useSeries<T extends object>(
  config: ChartConfig<T>,
  resolvedXKey: Exclude<keyof T, number | symbol>,
) {
  const series = useMemo(() => {
    const ctx: SeriesBuildCtx = { resolvedXKey };
    const buildSeries = config.series
      .map((cfg, idx) => {
        const builder = seriesBuilders[cfg.type as keyof typeof seriesBuilders];
        if (!builder) {
          throw new Error(`${cfg.type} not supported`);
        }
        return builder(cfg, ctx);
      })
      .filter(isSeries);
    return buildSeries;
  }, [config.series, resolvedXKey]);

  return series;
}
