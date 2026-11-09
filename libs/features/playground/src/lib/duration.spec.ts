import { durationToMs } from './duration';

describe('durationToMs', () => {
  it.each([
    ['10s', 10_000],
    ['5m', 300_000],
    ['1h 30m', 5_400_000],
    ['1h, 30m', 5_400_000],
    ['1h30m', 5_400_000],
    ['1.5h', 5_400_000],
    ['0.5s', 500],
    ['60 sec', 60_000],
    ['2 hours', 7_200_000],
    ['100ms', 100],
    ['1w', 604_800_000],
    ['P1W', 604_800_000],
    ['PT10S', 10_000],
    ['pt1.5s', 1500],
    ['PT1,5S', 1500],
    ['P1DT2H', 93_600_000],
    ['PT1H30M', 5_400_000],
    ['01:30:00', 5_400_000],
    ['0', 0],
    ['0s', 0],
  ])('reads %s as %d ms', (value, expected) => {
    expect(durationToMs(value)).toBe(expected);
  });

  it.each(['soon', 'abc1sxyz', '1y', '2mo', 'P1M', 'P1Y', 'P', 'PT', '-5s'])(
    'rejects %s',
    (value) => {
      expect(durationToMs(value)).toBeNaN();
    },
  );
});
