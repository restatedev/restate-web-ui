const formatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',

  timeZoneName: 'short',
});
const utcFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

export function formatDateTime(value: Date, timezone: 'UTC' | 'system') {
  if (timezone === 'UTC') {
    return utcFormatter.format(value);
  } else {
    return formatter.format(value);
  }
}
