const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const MS_PER_UNIT: Record<string, number> = {
  w: WEEK,
  wk: WEEK,
  wks: WEEK,
  week: WEEK,
  weeks: WEEK,
  d: DAY,
  day: DAY,
  days: DAY,
  h: HOUR,
  hr: HOUR,
  hrs: HOUR,
  hour: HOUR,
  hours: HOUR,
  m: MINUTE,
  min: MINUTE,
  mins: MINUTE,
  minute: MINUTE,
  minutes: MINUTE,
  s: SECOND,
  sec: SECOND,
  secs: SECOND,
  second: SECOND,
  seconds: SECOND,
  ms: 1,
  msec: 1,
  msecs: 1,
  millisecond: 1,
  milliseconds: 1,
  us: 1e-3,
  µs: 1e-3,
  usec: 1e-3,
  usecs: 1e-3,
  microsecond: 1e-3,
  microseconds: 1e-3,
  ns: 1e-6,
  nsec: 1e-6,
  nsecs: 1e-6,
  nanosecond: 1e-6,
  nanoseconds: 1e-6,
};

const NUMBER = '(\\d+(?:[.,]\\d+)?)';
const ISO_DURATION = new RegExp(
  `^P(?!$)(?:${NUMBER}W)?(?:${NUMBER}D)?(?:T(?!$)(?:${NUMBER}H)?(?:${NUMBER}M)?(?:${NUMBER}S)?)?$`,
  'i',
);
const CLOCK_DURATION = /^(\d+):([0-5]\d):([0-5]\d(?:\.\d+)?)$/;
const FRIENDLY_PART = /(\d+(?:\.\d+)?)\s*([a-zµ]+)\s*,?\s*/iy;

function isoNumber(value: string | undefined) {
  return value ? Number(value.replace(',', '.')) : 0;
}

function friendlyToMs(value: string) {
  let total = 0;
  let end = 0;
  while (end < value.length) {
    FRIENDLY_PART.lastIndex = end;
    const match = FRIENDLY_PART.exec(value);
    const unit = MS_PER_UNIT[match?.[2]?.toLowerCase() ?? ''];
    if (!match || unit === undefined) {
      return NaN;
    }
    total += Number(match[1]) * unit;
    end = FRIENDLY_PART.lastIndex;
  }
  return end > 0 ? total : NaN;
}

export function durationToMs(value: string) {
  const text = value.trim();
  if (text === '0') {
    return 0;
  }
  const iso = text.match(ISO_DURATION);
  if (iso) {
    const [, weeks, days, hours, minutes, seconds] = iso;
    return Math.round(
      isoNumber(weeks) * WEEK +
        isoNumber(days) * DAY +
        isoNumber(hours) * HOUR +
        isoNumber(minutes) * MINUTE +
        isoNumber(seconds) * SECOND,
    );
  }
  const clock = text.match(CLOCK_DURATION);
  if (clock) {
    const [, hours, minutes, seconds] = clock;
    return Math.round(
      Number(hours) * HOUR +
        Number(minutes) * MINUTE +
        Number(seconds) * SECOND,
    );
  }
  return Math.round(friendlyToMs(text));
}
