const formatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
});

export function formatDate(value: Date) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return formatter.format(value);
}

export function formatDateRange(start: Date, end: Date) {
  if (isNaN(start.valueOf()) || isNaN(end.valueOf())) {
    return '';
  }

  return formatter.formatRange(start, end);
}
