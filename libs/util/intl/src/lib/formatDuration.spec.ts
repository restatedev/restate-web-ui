import { formatCompactISODuration } from './formatDuration';

describe('formatCompactISODuration', () => {
  it.each([
    ['PT49H', '2.04d'],
    ['PT1H11M59S', '1.18h'],
    ['PT7M30S', '7.5m'],
    ['PT7.588S', '7.59s'],
    ['PT0.017S', '17ms'],
    ['PT0S', '0ms'],
    ['invalid', 'invalid'],
  ])('formats %s as %s', (duration, expected) => {
    expect(formatCompactISODuration(duration)).toBe(expected);
  });
});
