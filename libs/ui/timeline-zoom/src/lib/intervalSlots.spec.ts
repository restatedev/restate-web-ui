import { renderHook } from '@testing-library/react';
import type { TimelineMode } from './TimelineEngineContext';
import { useTimelineIntervalSlots } from './intervalSlots';

const HOUR_MS = 3_600_000;

function renderSlots(mode: TimelineMode) {
  const segmentCounts: number[] = [];
  const hook = renderHook(
    (props: { durationMs: number; targetIntervalMs: number }) => {
      const result = useTimelineIntervalSlots({
        durationMs: props.durationMs,
        viewportStartOffsetMs: 0,
        viewportEndOffsetMs: props.durationMs,
        targetIntervalMs: props.targetIntervalMs,
        mode,
        transitionDurationMs: 0,
      });
      segmentCounts.push(result.segments.length);
      return result;
    },
    { initialProps: { durationMs: 2_000, targetIntervalMs: 200 } },
  );
  return { ...hook, segmentCounts };
}

describe('useTimelineIntervalSlots', () => {
  it.each<TimelineMode>(['static', 'live-follow', 'inspect'])(
    'never renders thousands of slots when the range jumps from seconds to hours (%s)',
    (mode) => {
      const { rerender, segmentCounts, result } = renderSlots(mode);

      rerender({ durationMs: 3 * HOUR_MS, targetIntervalMs: 30 * 60_000 });

      expect(Math.max(...segmentCounts)).toBeLessThanOrEqual(200);
      expect(result.current.segments.length).toBeGreaterThan(0);
    },
  );

  it('jumps straight to a far live interval instead of doubling towards it', () => {
    const { rerender, result } = renderSlots('live-follow');

    rerender({ durationMs: 3 * HOUR_MS, targetIntervalMs: 30 * 60_000 });

    expect(result.current.segments[0]?.key.startsWith(`${30 * 60_000}-`)).toBe(
      true,
    );
  });
});
