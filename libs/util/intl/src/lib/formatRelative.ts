const formatter = new Intl.RelativeTimeFormat('en', { style: 'narrow' });

export function formatRelativeTime(value: number) {
  const formatted = formatter.format(value, 'seconds');
  return formatted;
}
