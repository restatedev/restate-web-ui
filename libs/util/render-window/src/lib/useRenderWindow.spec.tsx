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

  it('follows a fast scroll with the visible rows and a few rows ahead', () => {
    const { result } = renderHook(() => useRenderWindow(WIDE_ROWS));
    result.current.rangeExtractor(range(0, 20));
    result.current.scrollStateRef.current = { scrollDirection: 'forward' };

    const inside = result.current.follow(range(5, 25), 6);
    expect([inside[0], inside.at(-1)]).toEqual([0, 32]);

    const ahead = result.current.follow(range(30, 50), 6);
    expect([ahead[0], ahead.at(-1)]).toEqual([0, 56]);

    const jumped = result.current.follow(range(200, 220), 6);
    expect([jumped[0], jumped.at(-1)]).toEqual([199, 226]);
  });

  it('keeps the window when following would add more rows than allowed', () => {
    const { result } = renderHook(() => useRenderWindow(WIDE_ROWS));
    result.current.rangeExtractor(range(0, 20));
    result.current.scrollStateRef.current = { scrollDirection: 'forward' };

    const ahead = result.current.follow(range(30, 50), 6, 25);
    expect([ahead[0], ahead.at(-1)]).toEqual([0, 56]);

    expect(result.current.follow(range(200, 220), 6, 25)).toBe(ahead);
    expect(result.current.windowRef.current?.end).toBe(56);
  });

  it('drops rows behind a long fast scroll once the window is full', () => {
    const { result } = renderHook(() => useRenderWindow(WIDE_ROWS));
    result.current.rangeExtractor(range(0, 20));
    result.current.scrollStateRef.current = { scrollDirection: 'forward' };

    let indexes: number[] = [];
    for (let start = 0; start <= 150; start += 5) {
      indexes = result.current.follow(range(start, start + 20), 6);
    }

    expect(indexes.at(-1)).toBe(176);
    expect(indexes.length).toBe(21 + 17 + 17 + 40);
    expect(indexes[0]).toBe(176 - indexes.length + 1);
  });
});
