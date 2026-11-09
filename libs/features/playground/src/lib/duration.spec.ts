import { durationToMs } from './duration';

describe('durationToMs', () => {
  it.each([
    ['10s', 10_000],
    ['5m', 300_000],
    ['1h 30m', 5_400_000],
    ['PT10S', 10_000],
    ['pt1.5s', 1500],
    ['P1DT2H', 93_600_000],
    ['PT1H30M', 5_400_000],
    ['soon', 0],
  ])('reads %s as %d ms', (value, expected) => {
    expect(durationToMs(value)).toBe(expected);
  });
});
