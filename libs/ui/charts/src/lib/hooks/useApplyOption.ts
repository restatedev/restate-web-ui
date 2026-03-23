import { RefObject, useEffect } from 'react';
import type { EChartsType } from 'echarts/core';
import type { ECOption } from '../types';

export function useApplyOption(
  chartRef: RefObject<EChartsType | null>,
  option: ECOption,
) {
  useEffect(() => {
    const inst = chartRef.current;
    if (!inst) return;
    try {
      inst.setOption(option, {
        notMerge: false,
        lazyUpdate: true,
        replaceMerge: ['dataset', 'series'],
      });
    } catch (e) {
      console.error('[Echarts] setOption failed', e);
    }
  }, [chartRef, option]);
}
