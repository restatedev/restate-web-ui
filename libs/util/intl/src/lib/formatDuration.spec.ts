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

  it('returns the same text when formatting a duration again', () => {
    const duration = { minutes: 2, seconds: 5, milliseconds: 0 };
    expect(formatDurations(duration)).toBe('2m 5s');
    expect(formatDurations(duration)).toBe('2m 5s');
  });

  it('keeps durations with the same numbers apart by style', () => {
    const duration = { minutes: 1, seconds: 30 };
    expect(formatDurations(duration)).toBe('1m 30s');
    expect(formatDurations(duration, { style: 'long' })).toBe(
      '1 minute, 30 seconds',
    );
    expect(formatDurations(duration)).toBe('1m 30s');
  });

  it('keeps durations apart when the same numbers sit in other units', () => {
    expect(formatDurations({ hours: 3, minutes: 0 })).toBe('3h');
    expect(formatDurations({ minutes: 3, seconds: 0 })).toBe('3m');
  });

  it('formats correctly after more durations than it keeps', () => {
    for (let seconds = 1; seconds <= 2_100; seconds++) {
      formatDurations({ hours: 1, seconds });
    }
    expect(formatDurations({ hours: 1, seconds: 7 })).toBe('1h 7s');
    expect(formatDurations({ hours: 1, seconds: 2_050 })).toBe('1h 2,050s');
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
