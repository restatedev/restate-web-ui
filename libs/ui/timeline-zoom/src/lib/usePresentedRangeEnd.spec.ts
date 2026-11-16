import {
  getHeadroomStepMs,
  getPresentationHeadroomMs,
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
