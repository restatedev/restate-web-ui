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

export function formatRange(
  start: Date,
  end: Date,
  timezone: 'UTC' | 'system' = 'system',
) {
  if (isNaN(start.valueOf()) || isNaN(end.valueOf())) {
    return '';
  }
  if (timezone === 'UTC') {
    return utcFormatter.formatRange(start, end);
  } else {
    return formatter.formatRange(start, end);
  }
}
