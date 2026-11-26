import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import {
  type RenderWindowOptions,
  useGrowRenderWindowWhenIdle,
  useRenderWindow,
} from './useRenderWindow';

const WIDE_ROWS: RenderWindowOptions = {
  overscan: 12,
  scrollAhead: 40,
  idleRowsAbove: 10,
  idleRowsBelow: 10,
  step: 5,
  maxGrowth: 10,
  idleStep: 1,
};

const range = (startIndex: number, endIndex: number) => ({
  startIndex,
  endIndex,
  overscan: 0,
  count: 300,
});

describe('useRenderWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps every visible row when the viewport holds more rows than the idle rows', () => {
    const { result } = renderHook(() => useRenderWindow(WIDE_ROWS));

    result.current.rangeExtractor(range(0, 68));
    result.current.scrollStateRef.current = { scrollDirection: 'forward' };
    const indexes = result.current.rangeExtractor(range(22, 90));

    expect(indexes[0]).toBeLessThanOrEqual(10);
    expect(indexes.at(-1)).toBeGreaterThanOrEqual(102);
  });

  it('stops changing the window once idle when the idle rows are fewer than the overscan', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => {
      const handle = useRenderWindow(WIDE_ROWS);
      useGrowRenderWindowWhenIdle(handle, false, 300, false);
      return handle;
    });

    const windows: string[] = [];
    for (let tick = 0; tick < 60; tick++) {
      const indexes = result.current.rangeExtractor(range(100, 120));
      windows.push(`${indexes[0]}-${indexes.at(-1)}`);
      act(() => {
        vi.advanceTimersByTime(30);
      });
    }

    expect(new Set(windows.slice(-20))).toEqual(new Set([windows.at(-1)]));
    expect(windows.at(-1)).toBe('83-137');
  });
});
