const formatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  fractionalSecondDigits: 3,
  timeZoneName: 'short',
});
const utcFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  fractionalSecondDigits: 3,
  timeZone: 'UTC',
  timeZoneName: 'short',
});

export function formatDateTime(value: Date, timezone: 'UTC' | 'system') {
  if (isNaN(value.valueOf())) {
    return '';
  }
  if (timezone === 'UTC') {
    return utcFormatter.format(value);
  } else {
    return formatter.format(value);
  }
}
