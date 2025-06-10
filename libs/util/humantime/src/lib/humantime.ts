interface Duration {
  years?: number;
  months?: number;
  days?: number;
  h?: number;
  m?: number;
  s?: number;
  ms?: number;
}

const HUMANTIME_REGEXP =
  /(?<unitValue>\d+)\s*(?<unit>msec|ms|seconds|second|sec|minute|minutes|hours|hour|days|day|min|M|m|s|h|d)/gm;

const HUMANTIME_UNITS_VALUES = [
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
] as const;

export const HUMANTIME_PATTERN_INPUT = HUMANTIME_UNITS_VALUES.map(
  () => `(\\d+\\s*(${HUMANTIME_UNITS_VALUES.join('|')}))?`
).join('\\s*');
type HUMANTIME_UNITS = (typeof HUMANTIME_UNITS_VALUES)[number];
const UNIT_MAPS: Record<
  HUMANTIME_UNITS,
  Exclude<keyof Duration, 'negative'>
> = {
  msec: 'ms',
  ms: 'ms',
  seconds: 's',
  second: 's',
  sec: 's',
  s: 's',
  minute: 'm',
  minutes: 'm',
  min: 'm',
  m: 'm',
  hours: 'h',
  hour: 'h',
  h: 'h',
  days: 'days',
  day: 'days',
  d: 'days',
};

export function formatHumantime(value?: string | null) {
  if (!value) {
    return undefined;
  }
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
      [isoUnit]: unitValueAsNumber,
    };
  }, {} as Duration);

  return Object.entries(isoDuration)
    .map(([unit, value]) => `${value}${unit}`)
    .join(' ');
}
