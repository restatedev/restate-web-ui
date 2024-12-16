const formatter = new Intl.PluralRules('en', { type: 'cardinal' });

export function formatPlurals(
  n: number,
  options: { one: string; other: string }
) {
  const rule = formatter.select(n) as 'one' | 'other';
  return options[rule];
}
