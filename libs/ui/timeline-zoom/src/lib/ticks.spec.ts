import { selectTickInterval } from './ticks';

const HOUR_MS = 3_600_000;
const WIDTH_PX = 1_000;

function spacingPx(intervalMs: number, visibleMs: number) {
  return (intervalMs / visibleMs) * WIDTH_PX;
}

describe('selectTickInterval', () => {
  it('jumps straight to a fitting interval when the current one is far too dense', () => {
    const now = Date.now();
    const interval = selectTickInterval(
      HOUR_MS,
      WIDTH_PX,
      200,
      now,
      'static',
      now,
      false,
    );

    expect(spacingPx(interval, HOUR_MS)).toBeGreaterThan(35);
    expect(spacingPx(interval, HOUR_MS)).toBeLessThan(280);
  });

  it('jumps straight to a fitting interval when the current one is far too sparse', () => {
    const now = Date.now();
    const interval = selectTickInterval(
      2_000,
      WIDTH_PX,
      HOUR_MS,
      now,
      'inspect',
      now,
      false,
    );

    expect(spacingPx(interval, 2_000)).toBeLessThan(280);
  });

  it('keeps an interval that already fits', () => {
    const now = Date.now();
    expect(
      selectTickInterval(10_000, WIDTH_PX, 1_000, now, 'static', now, false),
    ).toBe(1_000);
  });

  it('still waits out the cooldown for a small change', () => {
    const now = Date.now();
    expect(
      selectTickInterval(10_000, WIDTH_PX, 500, now, 'static', now, false),
    ).toBe(500);
  });
});
