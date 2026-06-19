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

const hourFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  timeZoneName: 'short',
});
const utcHourFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  timeZone: 'UTC',
  timeZoneName: 'short',
});

// Compact hour-granularity range, e.g. "Jun 18, 7 – 8 PM GMT+1". Intl collapses
// the parts shared by both ends (date, period, zone).
export function formatHourRange(
  start: Date,
  end: Date,
  timezone: 'UTC' | 'system' = 'system',
) {
  if (isNaN(start.valueOf()) || isNaN(end.valueOf())) {
    return '';
  }
  return timezone === 'UTC'
    ? utcHourFormatter.formatRange(start, end)
    : hourFormatter.formatRange(start, end);
}
