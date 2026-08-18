import { DurationFormat } from '@formatjs/intl-durationformat';
import { parseAbsoluteToLocal, parseDuration } from '@internationalized/date';
import { formatNumber } from './formatNumber';

type DurationStyle = 'long' | 'short' | 'narrow' | 'digital';

const getFormatter = (style: DurationStyle = 'narrow') =>
  new DurationFormat('en', {
    style,
    round: true,
    milliseconds: 'numeric',
  });

const formatter = getFormatter();

type FormatDurationOptions = {
  style?: DurationStyle;
};

export function formatDurations(
  {
    isPast,
    ...duration
  }: Parameters<DurationFormat['format']>[0] & { isPast?: boolean },
  options?: FormatDurationOptions,
) {
  const activeFormatter = options?.style
    ? getFormatter(options.style)
    : formatter;
  const allEntries = Object.values(duration);
  const isDurationZero = allEntries.reduce((p, c) => p + c, 0) === 0;
  if (isDurationZero) {
    return '0ms';
  }

  const isValid =
    allEntries.length > 0 &&
    allEntries.every((entry) => typeof entry === 'number' && !isNaN(entry));
  if (!isValid) {
    return '';
  }

  const subSecondMilliseconds =
    (duration.seconds ?? 0) * 1000 +
    (duration.milliseconds ?? 0) +
    (duration.microseconds ?? 0) / 1000 +
    (duration.nanoseconds ?? 0) / 1_000_000;
  const hasLargerUnit =
    Boolean(duration.years) ||
    Boolean(duration.months) ||
    Boolean(duration.weeks) ||
    Boolean(duration.days) ||
    Boolean(duration.hours) ||
    Boolean(duration.minutes);
  if (!hasLargerUnit && subSecondMilliseconds < 1000) {
    return `${formatNumber(subSecondMilliseconds)}ms`;
  }

  const parts = activeFormatter.formatToParts(duration);
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

export function formatMilliseconds(milliseconds: number) {
  if (milliseconds < 1000) {
    return `${formatNumber(milliseconds)}ms`;
  }
  return formatDurations(normaliseDuration({ milliseconds }));
}

export function parseISODuration(iso: string) {
  return parseDuration(iso);
}

export function formatCompactDuration(
  duration: Parameters<DurationFormat['format']>[0],
) {
  const value = normaliseDuration(duration);
  const days = value.days ?? 0;
  const hours = value.hours ?? 0;
  const minutes = value.minutes ?? 0;
  const seconds = value.seconds ?? 0;
  const milliseconds = value.milliseconds ?? 0;

  if (days) return `${formatNumber(days + hours / 24, true)}d`;
  if (hours) return `${formatNumber(hours + minutes / 60, true)}h`;
  if (minutes) return `${formatNumber(minutes + seconds / 60, true)}m`;
  if (seconds) return `${formatNumber(seconds + milliseconds / 1000, true)}s`;
  return `${formatNumber(milliseconds, true)}ms`;
}

export function formatCompactISODuration(iso: string) {
  try {
    return formatCompactDuration(parseISODuration(iso));
  } catch {
    return iso;
  }
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
  const secondsMs = Math.round(((input.seconds ?? 0) % 1) * 1000);

  let total =
    toBigInt(input.years) * Y +
    toBigInt(input.months) * MO +
    toBigInt(input.weeks) * W +
    toBigInt(input.days) * D +
    toBigInt(input.hours) * H +
    toBigInt(input.minutes) * M +
    toBigInt(input.seconds) * S +
    toBigInt(input.milliseconds) * MS +
    BigInt(secondsMs) * MS;

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
