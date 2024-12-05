const formatter = new Intl.PluralRules('en', { type: 'ordinal' });

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th'],
]);

const numberFormatter = new Intl.NumberFormat('en');

export function formatOrdinals(n: number) {
  const rule = formatter.select(n);
  const suffix = suffixes.get(rule);
  return `${numberFormatter.format(n)}${suffix}`;
}
