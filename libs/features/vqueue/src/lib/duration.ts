import {
  formatDurations,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';

// Common shape shared by getDuration (ms → parts) and normaliseDuration (ISO →
// parts); both are assignable to it and it satisfies formatDurations' input.
type DurationParts = {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  isPast?: boolean;
};

// A vqueue duration column serialises either as an ISO 8601 interval string
// ("PT8.2S" — the common case for DataFusion intervals) or, on some servers, a
// bare number we treat as milliseconds. Normalise both to the parts shape
// formatDurations / getDuration share.
function toParts(value?: string | number | null): DurationParts | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  // getDuration / formatDurations require integer parts — float ms (e.g. a
  // summed 965.9999999999964) makes DurationFormat throw, so round here.
  if (typeof value === 'number') {
    return Number.isFinite(value) ? getDuration(Math.round(value)) : undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (/^-?p/i.test(trimmed)) {
    try {
      return normaliseDuration(parseISODuration(trimmed));
    } catch {
      return undefined;
    }
  }
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber)
    ? getDuration(Math.round(asNumber))
    : undefined;
}

// Human label for a duration value, e.g. "8.2s", "2m 30s". Empty string when
// the value can't be parsed (callers fall back to a dash).
export function formatVqueueDuration(value?: string | number | null): string {
  const parts = toParts(value);
  if (!parts) {
    return '';
  }
  return formatDurations(parts);
}

// Magnitude in seconds — used to size the wait bars proportionally (and to sum
// a breakdown's total). Returns 0 for unparseable / empty values.
export function durationToSeconds(value?: string | number | null): number {
  const parts = toParts(value);
  if (!parts) {
    return 0;
  }
  const {
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
  } = parts;
  return (
    days * 86400 + hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
  );
}
