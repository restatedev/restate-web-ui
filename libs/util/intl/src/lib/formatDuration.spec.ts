import { formatCompactISODuration, formatMilliseconds } from './formatDuration';

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

describe('formatMilliseconds', () => {
  it.each([
    [0, '0ms'],
    [17, '17ms'],
    [999, '999ms'],
    [1000, '1s'],
    [7588, '7.588s'],
    [90000, '1m 30s'],
  ])('formats %d milliseconds as %s', (milliseconds, expected) => {
    expect(formatMilliseconds(milliseconds)).toBe(expected);
  });
});
