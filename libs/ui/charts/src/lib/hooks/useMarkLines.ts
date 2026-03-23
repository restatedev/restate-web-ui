import { useMemo } from 'react';
import type { RefLineConfig, AxisType } from '../types';

function isNotNullable<T>(
  value: T | undefined | null,
): value is NonNullable<T> {
  return value !== undefined && value !== null;
}
export function useMarkLines(refLines: RefLineConfig[], xType: AxisType) {
  return useMemo(() => {
    if (!refLines?.length) {
      return undefined;
    }
    const data = refLines
      .map((refLine) => {
        const lineStyle = {
          type: refLine.dashed ? 'dashed' : 'solid',
          width: 1,
        } as const;
        if (refLine.y != null)
          return { yAxis: refLine.y, name: refLine.name, lineStyle };
        if (refLine.x != null) {
          const x =
            xType === 'time'
              ? refLine.x instanceof Date
                ? refLine.x.getTime()
                : typeof refLine.x === 'string'
                  ? Date.parse(refLine.x)
                  : typeof refLine.x === 'number'
                    ? refLine.x
                    : undefined
              : refLine.x instanceof Date
                ? undefined
                : refLine.x;
          return { xAxis: x, name: refLine.name, lineStyle };
        }
        return null;
      })
      .filter(isNotNullable);
    return { data };
  }, [refLines, xType]);
}
