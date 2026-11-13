import { act, renderHook } from '@testing-library/react';
import { useTimelineZoom } from './useTimelineZoom';

const START = 1_000_000;
const HOUR_MS = 3_600_000;

function renderZoom(isComplete: boolean) {
  return renderHook(
    ({ rangeEndMs }: { rangeEndMs: number }) =>
      useTimelineZoom({
        rangeStartMs: START,
        rangeEndMs,
        nowMs: rangeEndMs,
        isComplete,
        isStreaming: !isComplete,
        containerWidthPx: 1_000,
      }),
    { initialProps: { rangeEndMs: START + 1_400 } },
  );
}

describe('useTimelineZoom', () => {
  it('shrinks a finished timeline back when its range gets shorter', () => {
    const { rerender, result } = renderZoom(true);

    rerender({ rangeEndMs: START + HOUR_MS });
    expect(result.current.observedRangeDurationMs).toBe(HOUR_MS);

    rerender({ rangeEndMs: START + 1_400 });
    expect(result.current.observedRangeDurationMs).toBe(1_400);
    expect(result.current.visibleWindowEndMs).toBe(START + 1_400);
  });

  it('drops a zoom window that ends past the shorter range', () => {
    const { rerender, result } = renderZoom(true);

    rerender({ rangeEndMs: START + HOUR_MS });
    act(() => {
      result.current.setVisibleWindow(START + 30 * 60_000, START + 40 * 60_000);
    });
    expect(result.current.visibleWindowStartMs).toBe(START + 30 * 60_000);

    rerender({ rangeEndMs: START + 1_400 });
    expect(result.current.visibleWindowStartMs).toBe(START);
    expect(result.current.visibleWindowEndMs).toBe(START + 1_400);
  });

  it('keeps a zoom window that still fits the shorter range', () => {
    const { rerender, result } = renderZoom(true);

    rerender({ rangeEndMs: START + HOUR_MS });
    act(() => {
      result.current.setVisibleWindow(START + 200, START + 1_000);
    });

    rerender({ rangeEndMs: START + 1_400 });
    expect(result.current.visibleWindowStartMs).toBe(START + 200);
    expect(result.current.visibleWindowEndMs).toBe(START + 1_000);
  });

  it('never shrinks a live timeline', () => {
    const { rerender, result } = renderZoom(false);

    rerender({ rangeEndMs: START + HOUR_MS });
    rerender({ rangeEndMs: START + 1_400 });
    expect(result.current.observedRangeDurationMs).toBe(HOUR_MS);
  });
});
