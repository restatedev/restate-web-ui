import { serialize, Duration } from 'tinyduration';

const HUMANTIME_REGEXP =
  /(?<unitValue>\d+)\s*(?<unit>nsec|ns|usec|us|msec|ms|seconds|second|sec|minute|minutes|hours|hour|days|day|months|month|years|year|y|min|M|m|s|h|d)/gm;

const HUMANTIME_UNITS_VALUES = [
  'nsec',
  'ns',
  'usec',
  'us',
  'msec',
  'ms',
  'seconds',
  'second',
  'sec',
  's',
  'minute',
  'minutes',
  'min',
  'm',
  'hours',
  'hour',
  'h',
  'days',
  'day',
  'd',
  'months',
  'month',
  'M',
  'years',
  'year',
  'y',
] as const;

export const HUMANTIME_PATTERN_INPUT = HUMANTIME_UNITS_VALUES.map(
  () => `(\\d+\\s*(${HUMANTIME_UNITS_VALUES.join('|')}))?`
).join('\\s*');
type HUMANTIME_UNITS = (typeof HUMANTIME_UNITS_VALUES)[number];
const UNIT_MAPS: Record<
  HUMANTIME_UNITS,
  Exclude<keyof Duration, 'negative'>
> = {
  nsec: 'seconds',
  ns: 'seconds',
  usec: 'seconds',
  us: 'seconds',
  msec: 'seconds',
  ms: 'seconds',
  seconds: 'seconds',
  second: 'seconds',
  sec: 'seconds',
  s: 'seconds',
  minute: 'minutes',
  minutes: 'minutes',
  min: 'minutes',
  m: 'minutes',
  hours: 'hours',
  hour: 'hours',
  h: 'hours',
  days: 'days',
  day: 'days',
  d: 'days',
  months: 'months',
  month: 'months',
  M: 'months',
  years: 'years',
  year: 'years',
  y: 'years',
};
const UNIT_FACTOR: Partial<Record<HUMANTIME_UNITS, number>> = {
  nsec: 0.000000001,
  ns: 0.000000001,
  usec: 0.000001,
  us: 0.000001,
  msec: 0.001,
  ms: 0.001,
};

export function parseHumantime(value: string) {
  const matches = Array.from(value.matchAll(HUMANTIME_REGEXP));

  const isoDuration = matches.reduce((result, match) => {
    const { groups = {} } = match;
    const { unitValue, unit } = groups;
    const unitValueAsNumber = Number(unitValue);
    const isoUnit = UNIT_MAPS[unit as HUMANTIME_UNITS];

    if (isNaN(unitValueAsNumber)) {
      return result;
    }

    return {
      ...result,
      [isoUnit]:
        (result[isoUnit] ?? 0) +
        unitValueAsNumber * (UNIT_FACTOR[unit as HUMANTIME_UNITS] ?? 1),
    };
  }, {} as Duration);

  return serialize(isoDuration);
}
