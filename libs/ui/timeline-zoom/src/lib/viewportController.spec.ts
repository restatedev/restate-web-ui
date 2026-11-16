import { describe, expect, it } from 'vitest';
import { INITIAL_VIEWPORT_CONTROLLER_STATE } from './constants';
import { viewportControllerReducer } from './viewportController';

describe('viewportControllerReducer pan-window', () => {
  const pan = (deltaMs: number, window = { startMs: 0, endMs: 2_000 }) =>
    viewportControllerReducer(INITIAL_VIEWPORT_CONTROLLER_STATE, {
      type: 'pan-window',
      deltaMs,
      currentVisibleWindow: window,
      renderDomainStartMs: 0,
      renderDomainEndMs: 2_000,
    });

  it('keeps the automatic viewport when the whole range is already visible', () => {
    expect(pan(400)).toBe(INITIAL_VIEWPORT_CONTROLLER_STATE);
    expect(pan(-400)).toBe(INITIAL_VIEWPORT_CONTROLLER_STATE);
  });

  it('keeps the automatic viewport when a zoomed window is already at the edge', () => {
    expect(pan(400, { startMs: 1_500, endMs: 2_000 })).toBe(
      INITIAL_VIEWPORT_CONTROLLER_STATE,
    );
  });

  it('keeps small pans on short zoomed windows', () => {
    expect(pan(0.1, { startMs: 0, endMs: 20 })).toEqual({
      manualVisibleWindow: { startMs: 0.1, endMs: 20.1 },
      stickyToLatestEdge: false,
      keepFullRangeWhileStreaming: false,
    });
  });

  it('stores the moved window when the pan moves it', () => {
    expect(pan(300, { startMs: 0, endMs: 500 })).toEqual({
      manualVisibleWindow: { startMs: 300, endMs: 800 },
      stickyToLatestEdge: false,
      keepFullRangeWhileStreaming: false,
    });
  });
});
