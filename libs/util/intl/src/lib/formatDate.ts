const rangeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateRange(start: Date, end: Date) {
  if (isNaN(start.valueOf()) || isNaN(end.valueOf())) {
    return '';
  }

  return rangeFormatter.formatRange(start, end);
}
