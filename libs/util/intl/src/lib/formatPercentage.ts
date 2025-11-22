const formatter = new Intl.NumberFormat('en', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const formatterWithoutFraction = new Intl.NumberFormat('en', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPercentage(value: number) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return formatter.format(value);
}

export function formatPercentageWithoutFraction(value: number) {
  if (isNaN(value.valueOf())) {
    return '';
  }
  return formatterWithoutFraction.format(value);
}
