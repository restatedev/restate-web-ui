const formatter = new Intl.RelativeTimeFormat('en', { style: 'narrow' });

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit
) {
  const formatted = formatter.format(value, unit);
  return formatted;
}
