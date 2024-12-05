import { DurationFormat } from '@formatjs/intl-durationformat';

const formatter = new DurationFormat('en', {
  style: 'narrow',
  fractionalDigits: 0,
  round: true,
});

export function formatDurations(
  duration: Parameters<DurationFormat['format']>[0]
) {
  const formatted = formatter.format(duration);
  return formatted;
}
