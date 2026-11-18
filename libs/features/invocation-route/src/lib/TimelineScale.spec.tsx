import {
  getTimelineDrawWindow,
  getTimelineScale,
  scaleTimelinePercent,
  scaleTimelinePercentFromEnd,
  TIMELINE_DRAW_WINDOW_INSET,
  timelineDrawWindowStyle,
  timelineEntrySpanStyle,
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

describe('getTimelineDrawWindow', () => {
  it('draws the whole timeline when all of it is in view', () => {
    const window = getTimelineDrawWindow({ zoomLevel: 1, offsetPercent: 0 });

    expect(window.start).toBeLessThanOrEqual(0);
    expect(window.end).toBeGreaterThanOrEqual(1);
  });

  it('keeps two viewports on either side of the visible part', () => {
    for (const zoomLevel of [3, 64, 1_500, 10_373]) {
      for (const offsetPercent of [0, 12.34, 50, 99.9, 100 - 100 / zoomLevel]) {
        const viewport = 1 / zoomLevel;
        const visibleStart = offsetPercent / 100;
        const { start, end } = getTimelineDrawWindow({
          zoomLevel,
          offsetPercent,
        });

        expect(visibleStart - start).toBeGreaterThanOrEqual(
          2 * viewport - 1e-12,
        );
        expect(end - (visibleStart + viewport)).toBeGreaterThanOrEqual(
          2 * viewport - 1e-12,
        );
        expect((end - start) / viewport).toBeCloseTo(6);
      }
    }
  });

  it('stays put while the view pans within one viewport', () => {
    const zoomLevel = 100;

    expect(getTimelineDrawWindow({ zoomLevel, offsetPercent: 37.01 })).toEqual(
      getTimelineDrawWindow({ zoomLevel, offsetPercent: 37.99 }),
    );
    expect(
      getTimelineDrawWindow({ zoomLevel, offsetPercent: 38 }).start,
    ).toBeCloseTo(36 / zoomLevel);
  });

  it('picks the same viewport at a boundary despite rounding', () => {
    const zoomLevel = 2_048;
    const atEnd = 100 - 100 / zoomLevel;

    expect(getTimelineDrawWindow({ zoomLevel, offsetPercent: atEnd })).toEqual(
      getTimelineDrawWindow({
        zoomLevel,
        offsetPercent: atEnd * (1 - Number.EPSILON),
      }),
    );
  });

  it('draws everything when the zoom is unknown', () => {
    for (const [zoomLevel, offsetPercent] of [
      [Number.NaN, 0],
      [Number.POSITIVE_INFINITY, 0],
      [4, Number.NaN],
    ] as const) {
      const window = getTimelineDrawWindow({ zoomLevel, offsetPercent });

      expect(window.start).toBeLessThanOrEqual(0);
      expect(window.end).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('timeline draw window styles', () => {
  it('passes the window to the rows as CSS variables', () => {
    expect(timelineDrawWindowStyle({ start: 0.25, end: 0.5 })).toEqual({
      '--timeline-draw-start': 0.25,
      '--timeline-draw-end': 0.5,
    });
  });

  it('insets full-width lines to the window', () => {
    expect(TIMELINE_DRAW_WINDOW_INSET).toEqual({
      left: 'max(0%, calc(var(--timeline-draw-start, -1) * 100%))',
      right: 'max(0%, calc((1 - var(--timeline-draw-end, 2)) * 100%))',
    });
  });

  it('never passes an empty span to a bar', () => {
    expect(timelineEntrySpanStyle(0.5, 0)).toEqual({
      '--timeline-entry-start': 0.5,
      '--timeline-entry-span': Number.EPSILON,
    });
  });
});
