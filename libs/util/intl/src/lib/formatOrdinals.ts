const formatter = new Intl.PluralRules(undefined, { type: 'ordinal' });
const numberFormatter = new Intl.NumberFormat();

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th'],
]);

export function formatOrdinals(n: number) {
  const rule = formatter.select(n);
  const suffix = suffixes.get(rule);
  return `${numberFormatter.format(n)}${suffix}`;
}
