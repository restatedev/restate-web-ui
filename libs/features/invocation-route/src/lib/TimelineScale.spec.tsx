import {
  getTimelineScale,
  scaleTimelinePercent,
  scaleTimelinePercentFromEnd,
} from './TimelineScale';

describe('getTimelineScale', () => {
  it('is 1 when the rows end where the timeline ends', () => {
    expect(
      getTimelineScale({ start: 1_000, end: 5_000, presentedEnd: 5_000 }),
    ).toBe(1);
  });

  it('shrinks the rows when the timeline reaches past their end', () => {
    const start = 1_000;
    const end = 7_000;
    const presentedEnd = 9_000;
    const scale = getTimelineScale({ start, end, presentedEnd });
    const entryStart = 4_000;

    expect(scale).toBe(0.75);
    expect(((entryStart - start) / (end - start)) * scale).toBeCloseTo(
      (entryStart - start) / (presentedEnd - start),
    );
  });

  it('is 1 when either range is empty', () => {
    expect(
      getTimelineScale({ start: 1_000, end: 1_000, presentedEnd: 2_000 }),
    ).toBe(1);
    expect(
      getTimelineScale({ start: 1_000, end: 2_000, presentedEnd: 1_000 }),
    ).toBe(1);
  });
});

describe('scaleTimelinePercent', () => {
  it('multiplies the percentage by the timeline scale', () => {
    expect(scaleTimelinePercent(0.25)).toBe(
      'calc(25% * var(--timeline-scale, 1))',
    );
  });

  it('measures from the end of the timeline', () => {
    expect(scaleTimelinePercentFromEnd(0.25)).toBe(
      'calc(100% - calc(25% * var(--timeline-scale, 1)))',
    );
  });
});
