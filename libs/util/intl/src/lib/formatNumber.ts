const formatter = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function formatNumber(n: number, compact?: boolean) {
  if (compact) {
    return compactFormatter.format(n);
  } else {
    return formatter.format(n);
  }
}
