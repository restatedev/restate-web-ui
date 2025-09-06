const formatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
});

export function formatDate(value: Date) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return formatter.format(value);
}
