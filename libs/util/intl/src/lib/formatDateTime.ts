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

const compactTimeFormatter = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const compactDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});

const compactDateWithYearFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
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

export function formatCompactTime(value: Date) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return compactTimeFormatter.format(value);
}

export function formatCompactDateTime(
  value: Date,
  referenceDate: Date = new Date(),
) {
  if (isNaN(value.valueOf())) {
    return '';
  }

  const includeYear =
    isNaN(referenceDate.valueOf()) ||
    value.getFullYear() !== referenceDate.getFullYear();
  const date = includeYear
    ? compactDateWithYearFormatter.format(value)
    : compactDateFormatter.format(value);

  return `${date} at ${formatCompactTime(value)}`;
}
