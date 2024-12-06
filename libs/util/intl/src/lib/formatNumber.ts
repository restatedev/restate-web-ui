const formatter = new Intl.NumberFormat('en');

export function formatNumber(n: number) {
  return formatter.format(n);
}
