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
  darkValue?: string;
  darkAlias?: string;
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

export interface InternalToken {
  variable: string;
  value: string;
  darkValue: string;
}

function declarations(block: string) {
  return [...block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(
    ([, property = '', value = '']) =>
      [property, value.replace(/\s+/g, ' ').trim()] as const,
  );
}

function themeBlock(css: string) {
  return css.match(/@theme(?:\s+[a-z]+)*\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
}

function rootBlock(css: string) {
  return css.match(/@layer base\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
}

function darkBlock(css: string) {
  return css.match(/\[data-theme='dark'\]\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
}

function darkValues(css: string) {
  return new Map(
    declarations(darkBlock(css)).map(([property, value]) => [
      `--${property}`,
      value,
    ]),
  );
}

export function hasDarkTheme(css: string) {
  return declarations(darkBlock(css)).length > 0;
}

export function parseInternals(css: string): InternalToken[] {
  const dark = darkValues(css);
  return declarations(rootBlock(css)).map(([property, value]) => ({
    variable: `--${property}`,
    value,
    darkValue: dark.get(`--${property}`) ?? value,
  }));
}

function toRuntime(value: string) {
  return value.replace(
    /--alpha\(\s*(.+?)\s*\/\s*([\d.]+%)\s*\)/g,
    'color-mix(in oklab, $1 $2, transparent)',
  );
}

export function themeScopeCss(
  css: string,
  selectors: { light: string; dark: string },
) {
  const base = [
    ...declarations(themeBlock(css)),
    ...declarations(rootBlock(css)),
  ];
  const rule = (selector: string, entries: (readonly [string, string])[]) =>
    `${selector}{${entries.map(([property, value]) => `--${property}:${toRuntime(value)};`).join('')}}`;
  return [
    rule(selectors.light, base),
    rule(selectors.dark, [...base, ...declarations(darkBlock(css))]),
  ].join('\n');
}

export function parseThemeTokens(css: string): ThemeToken[] {
  const theme = themeBlock(css);
  const dark = darkValues(css);
  const tokens: ThemeToken[] = [];
  for (const [property, value] of declarations(theme)) {
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
      value,
      darkValue: dark.get(`--${property}`) ?? value,
    });
  }
  const byVariable = new Map(tokens.map((token) => [token.variable, token]));
  const aliasOf = (value?: string) => {
    const target = value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
    return target ? byVariable.get(target)?.className : undefined;
  };
  return tokens.map((token) => {
    const alias = aliasOf(token.value);
    const darkAlias = aliasOf(token.darkValue);
    return {
      ...token,
      ...(alias && { alias }),
      ...(darkAlias && { darkAlias }),
    };
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
