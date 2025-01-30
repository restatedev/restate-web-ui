import { DurationFormat } from '@formatjs/intl-durationformat';

const formatter = new DurationFormat('en', {
  style: 'narrow',
  fractionalDigits: 0,
  round: true,
});

export function formatDurations({
  isPast,
  ...duration
}: Parameters<DurationFormat['format']>[0] & { isPast?: boolean }) {
  const allEntries = Object.values(duration);

  const isValid =
    allEntries.length > 0 &&
    allEntries.every((entry) => typeof entry === 'number' && !isNaN(entry));
  if (!isValid) {
    return '';
  }
  const formatted = formatter.format(duration);
  return formatted;
}
