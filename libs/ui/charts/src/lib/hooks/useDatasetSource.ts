import { useMemo } from 'react';
import type { AxisType } from '../types';

export function useDatasetSource<T extends object>(
  data: T[],
  xKey: keyof T | undefined,
  xType: AxisType,
) {
  return useMemo(() => {
    if (xType !== 'time' || !xKey) {
      return data;
    }
    return data.map((row) => {
      const xValue = row[xKey];
      const ms =
        xValue instanceof Date
          ? xValue.getTime()
          : typeof xValue === 'number'
            ? xValue
            : typeof xValue === 'string'
              ? Date.parse(xValue)
              : undefined;
      if (ms === undefined || Number.isNaN(ms)) {
        throw new Error('Invalid xAxis time value');
      }
      return { ...row, [xKey]: ms };
    });
  }, [data, xKey, xType]);
}
