const formatter = new Intl.NumberFormat('en');
const compactFormatter = new Intl.NumberFormat('en', { notation: 'compact' });

export function formatNumber(n: number, compact?: boolean) {
  if (compact) {
    return compactFormatter.format(n);
  } else {
    return formatter.format(n);
  }
}
