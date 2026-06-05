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

// Without fractional digits, a tiny positive ratio rounds to "0%" and a
// near-complete one to "100%", both misreading as "none"/"all" when the real
// value is neither. Surface those edges as "<1%"/">99%"; exact 0 and exact 1
// round cleanly, so they (and everything in between) return null.
function clampEdgePercentage(value: number) {
  if (value > 0 && value < 0.005) return '<1%';
  if (value < 1 && value >= 0.995) return '>99%';
  return null;
}

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
  return clampEdgePercentage(value) ?? formatterWithoutFraction.format(value);
}

// Approximate variant for sampled / estimated values — prefixes with "~",
// except on the clamped edges which already read as approximate.
export function formatApproxPercentage(value: number) {
  if (isNaN(value.valueOf())) return '';
  return (
    clampEdgePercentage(value) ?? `~${formatterWithoutFraction.format(value)}`
  );
}
