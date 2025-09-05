const formatter = new Intl.NumberFormat('en', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPercentage(value: number) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return formatter.format(value);
}
