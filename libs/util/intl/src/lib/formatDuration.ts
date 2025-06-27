import { DurationFormat } from '@formatjs/intl-durationformat';

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
