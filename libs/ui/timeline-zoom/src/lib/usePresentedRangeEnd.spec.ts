import { act, renderHook } from '@testing-library/react';
import {
  getHeadroomStepMs,
  getPresentationHeadroomMs,
  usePresentedRangeEnd,
} from './usePresentedRangeEnd';

describe('getHeadroomStepMs', () => {
  it('is half a pixel of the visible window', () => {
    expect(getHeadroomStepMs(60_000, 600)).toBe(50);
  });

  it('never steps while the timeline has no width', () => {
    expect(getHeadroomStepMs(60_000, 0)).toBe(Infinity);
    expect(getPresentationHeadroomMs(1_500, getHeadroomStepMs(60_000, 0))).toBe(
      0,
    );
  });
});

describe('getPresentationHeadroomMs', () => {
  it('follows the elapsed time without a step', () => {
    expect(getPresentationHeadroomMs(1_234, 0)).toBe(1_234);
  });

  it('stays within 0 and 2 s', () => {
    expect(getPresentationHeadroomMs(-50, 0)).toBe(0);
    expect(getPresentationHeadroomMs(5_000, 0)).toBe(2_000);
  });

  it('moves in whole steps', () => {
    expect(getPresentationHeadroomMs(0, 300)).toBe(0);
    expect(getPresentationHeadroomMs(300, 300)).toBe(300);
    expect(getPresentationHeadroomMs(1_999, 300)).toBe(1_800);
    expect(getPresentationHeadroomMs(9_000, 300)).toBe(1_800);
  });

  it('stays at 0 while now is close enough to pin to the edge', () => {
    expect(getPresentationHeadroomMs(80, 300)).toBe(0);
    expect(getPresentationHeadroomMs(80, 4_000)).toBe(0);
  });

  it('leaves the now pin as soon as the elapsed time would', () => {
    expect(getPresentationHeadroomMs(81, 300)).toBe(81);
    expect(getPresentationHeadroomMs(299, 300)).toBe(81);
    expect(getPresentationHeadroomMs(1_999, 4_000)).toBe(81);
    expect(getPresentationHeadroomMs(9_000, 4_000)).toBe(81);
  });
});

describe('usePresentedRangeEnd', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'],
      now: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderRangeEnd(stepMs: number) {
    let renders = 0;
    const view = renderHook(
      ({ nowMs }: { nowMs: number }) => {
        renders++;
        return usePresentedRangeEnd({
          actualEndMs: nowMs,
          authoritativeNowMs: nowMs,
          shouldAdvance: true,
          headroomStepMsRef: { current: stepMs },
        });
      },
      { initialProps: { nowMs: 10_000 } },
    );
    return { ...view, renders: () => renders };
  }

  it('moves the end in steps and renders only when a step is reached', () => {
    const { result, renders } = renderRangeEnd(500);
    expect(result.current.rangeEndMs).toBe(10_000);

    act(() => vi.advanceTimersByTime(600));
    expect(result.current.rangeEndMs).toBe(10_500);

    const rendersAtFirstStep = renders();
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.rangeEndMs).toBe(10_500);
    expect(renders()).toBe(rendersAtFirstStep);

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.rangeEndMs).toBe(12_000);
  });

  it('restarts the headroom at each poll without moving the end back', () => {
    const { result, rerender } = renderRangeEnd(500);
    act(() => vi.advanceTimersByTime(1_200));
    expect(result.current.rangeEndMs).toBe(11_000);

    rerender({ nowMs: 14_000 });
    expect(result.current).toEqual({ rangeEndMs: 15_000, nowMs: 14_000 });

    act(() => vi.advanceTimersByTime(600));
    expect(result.current.rangeEndMs).toBe(15_000);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.rangeEndMs).toBe(15_500);
  });
});
