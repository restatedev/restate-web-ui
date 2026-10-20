export type TokenUtility =
  | 'bg'
  | 'text'
  | 'border'
  | 'ring'
  | 'ring-offset'
  | 'outline'
  | 'fill'
  | 'stroke'
  | 'decoration'
  | 'shadow';

export interface ThemeToken {
  name: string;
  utility: TokenUtility;
  className: string;
  variable: string;
  value: string;
  alias?: string;
}

export const FAMILIES = [
  'accent',
  'info',
  'success',
  'warning',
  'danger',
  'pending',
] as const;

export type Family = (typeof FAMILIES)[number];

export const NAMESPACES: { prefix: string; utility: TokenUtility }[] = [
  { prefix: 'background-color-', utility: 'bg' },
  { prefix: 'text-decoration-color-', utility: 'decoration' },
  { prefix: 'text-color-', utility: 'text' },
  { prefix: 'border-color-', utility: 'border' },
  { prefix: 'ring-offset-color-', utility: 'ring-offset' },
  { prefix: 'ring-color-', utility: 'ring' },
  { prefix: 'outline-color-', utility: 'outline' },
  { prefix: 'fill-', utility: 'fill' },
  { prefix: 'stroke-', utility: 'stroke' },
  { prefix: 'box-shadow-color-', utility: 'shadow' },
];

export function parseThemeTokens(css: string): ThemeToken[] {
  const theme = css.match(/@theme(?:\s+[a-z]+)*\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const tokens: ThemeToken[] = [];
  for (const [, property = '', value = ''] of theme.matchAll(
    /--([a-z0-9-]+):\s*([^;]+);/g,
  )) {
    const namespace = NAMESPACES.find(({ prefix }) =>
      property.startsWith(prefix),
    );
    if (!namespace) {
      continue;
    }
    const name = property.slice(namespace.prefix.length);
    tokens.push({
      name,
      utility: namespace.utility,
      className: `${namespace.utility}-${name}`,
      variable: `--${property}`,
      value: value.trim(),
    });
  }
  const byVariable = new Map(tokens.map((token) => [token.variable, token]));
  return tokens.map((token) => {
    const target = token.value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
    const alias = target ? byVariable.get(target)?.className : undefined;
    return alias ? { ...token, alias } : token;
  });
}

export function familyOf(token: ThemeToken): Family | undefined {
  const name = token.name.replace(/^on-/, '');
  return FAMILIES.find(
    (family) => name === family || name.startsWith(`${family}-`),
  );
}

export function tierOf(token: ThemeToken, family: Family) {
  if (token.name === `on-${family}`) {
    return 'on';
  }
  return token.name === family ? 'base' : token.name.slice(family.length + 1);
}

export function isInverse(token: ThemeToken) {
  return token.name.startsWith('inverse');
}
