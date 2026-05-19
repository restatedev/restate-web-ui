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

// Approximate variant for sampled / estimated values — prefixes with "~".
// A tiny positive ratio rounds to "0%" with no fractional digits which would
// read as "none" alongside a "~", so surface those as "<1%" instead.
export function formatApproxPercentage(value: number) {
  if (isNaN(value.valueOf())) return '';
  if (value > 0 && value < 0.005) return '<1%';
  return `~${formatterWithoutFraction.format(value)}`;
}
