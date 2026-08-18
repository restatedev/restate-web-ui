import {
  formatCompactISODuration,
  formatDurations,
  formatMilliseconds,
} from './formatDuration';

describe('formatDurations', () => {
  it.each([
    [{ milliseconds: 331 }, '331ms'],
    [{ seconds: 0.331 }, '331ms'],
    [{ milliseconds: 999 }, '999ms'],
    [{ seconds: 1 }, '1s'],
    [{ seconds: 1, milliseconds: 31 }, '1.031s'],
  ])('formats %o as %s', (duration, expected) => {
    expect(formatDurations(duration)).toBe(expected);
  });
});

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
