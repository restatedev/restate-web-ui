import { DurationFormat } from '@formatjs/intl-durationformat';
import { parseAbsoluteToLocal, parseDuration } from '@internationalized/date';

const formatter = new DurationFormat('en', {
  style: 'narrow',
  round: true,
  milliseconds: 'numeric',
});

export function formatDurations({
  isPast,
  ...duration
}: Parameters<DurationFormat['format']>[0] & { isPast?: boolean }) {
  const allEntries = Object.values(duration);
  if (allEntries.length === 1 && allEntries.at(0) === 0) {
    return '0 ms';
  }

  const isValid =
    allEntries.length > 0 &&
    allEntries.every((entry) => typeof entry === 'number' && !isNaN(entry));
  if (!isValid) {
    return '';
  }
  const parts = formatter.formatToParts(duration);
  const shouldShowFraction =
    !duration.minutes && !duration.hours && !duration.days;
  const formatted = parts.reduce((result, { type, value, unit }) => {
    if (unit === 'second' && ['fraction', 'decimal'].includes(type as string)) {
      if (shouldShowFraction) {
        return result + value.substring(0, 3);
      } else {
        return result;
      }
    }
    return result + value;
  }, '');
  return formatted;
}

export function parseISODuration(iso: string) {
  return parseDuration(iso);
}

export function addDurationToDate(
  date: string,
  duration: {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
    microseconds?: number;
  },
) {
  const d = parseAbsoluteToLocal(date);
  return d.add(duration).toDate();
}

const MS = 1n;
const S = 1000n * MS;
const M = 60n * S;
const H = 60n * M;
const D = 24n * H;
const W = 7n * D;
const Y = 365n * D;
const MO = 30n * D;

export function normaliseDuration(input: {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  microseconds?: number;
}): {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  microseconds?: number;
} {
  let total =
    toBigInt(input.years) * Y +
    toBigInt(input.months) * MO +
    toBigInt(input.weeks) * W +
    toBigInt(input.days) * D +
    toBigInt(input.hours) * H +
    toBigInt(input.minutes) * M +
    toBigInt(input.seconds) * S +
    toBigInt(input.milliseconds) * MS;

  // break down to normalized parts (weeks folded into days)
  const days = total / D;
  total %= D;
  const hours = total / H;
  total %= H;
  const minutes = total / M;
  total %= M;
  const seconds = total / S;
  total %= S;
  const milliseconds = total;

  return {
    days: bnToNum(days),
    hours: bnToNum(hours),
    minutes: bnToNum(minutes),
    seconds: bnToNum(seconds),
    milliseconds: bnToNum(milliseconds),
  };
}

function toBigInt(n?: number) {
  return Number.isFinite(n) ? BigInt(Math.trunc(n!)) : 0n;
}

function bnToNum(v: bigint) {
  return v === 0n ? 0 : Number(v); // safe for realistic time parts
}
