export function formatBytes(
  value: number,
  unit: 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' = 'B',
): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const index = units.indexOf(unit);
  if (index === -1) throw new Error(`Invalid unit: ${unit}`);

  let bytes = value * Math.pow(1024, index);

  let u = 0;
  while (bytes >= 1024 && u < units.length - 1) {
    bytes /= 1024;
    u++;
  }

  const formatter = new Intl.NumberFormat('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(bytes)} ${units[u]}`;
}
