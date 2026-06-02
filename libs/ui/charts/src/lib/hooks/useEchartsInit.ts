import { RefObject, useEffect, useRef } from 'react';
import { init, type EChartsType } from 'echarts/core';
import { ensureEchartsRegistered } from '../echartsSetup';

export function useEchartsInit(
  container: RefObject<HTMLDivElement | null>,
  theme?: 'light' | 'dark',
  renderer: 'canvas' | 'svg' = 'svg',
) {
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !container.current) return;

    ensureEchartsRegistered();

    const inst = init(
      container.current,
      theme === 'dark' ? 'dark' : undefined,
      { renderer },
    );
    chartRef.current = inst;

    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(container.current);

    return () => {
      ro.disconnect();
      inst.dispose();
      chartRef.current = null;
    };
  }, [container, theme, renderer]);

  return chartRef;
}
