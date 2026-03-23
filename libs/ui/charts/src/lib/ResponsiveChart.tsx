import { useRef, useEffect } from 'react';
import { Chart } from './Chart';
import type { ChartHandle, ChartProps } from './types';

export function ResponsiveChart<T extends object>(
  props: Omit<ChartProps<T>, 'width' | 'height'>,
) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartHandle>(null);
  const size = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (!outerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const contentRect = entries[0]?.contentRect;
      if (!contentRect) return;
      size.current = { w: contentRect.width, h: contentRect.height };
      chartRef.current?.resize();
    });
    observer.observe(outerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} style={{ width: '100%', height: '100%' }}>
      <Chart {...props} width={'100%'} height={'100%'} />
    </div>
  );
}
