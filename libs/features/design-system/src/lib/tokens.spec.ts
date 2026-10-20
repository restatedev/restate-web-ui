import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { FAMILIES, familyOf, parseThemeTokens, tierOf } from './tokens';

const themeCss = readFileSync(
  createRequire(import.meta.url).resolve('@restate/util-styles/theme.css'),
  'utf8',
);

describe('parseThemeTokens', () => {
  it('maps each namespace to its utility and resolves aliases', () => {
    const tokens = parseThemeTokens(`@theme static {
  --background-color-surface: var(--color-white);
  --text-color-on-danger: var(--color-white);
  --fill-surface: var(--background-color-surface);
  --text-decoration-color-muted: var(--text-color-muted);
  --ring-offset-color-surface: var(--background-color-surface);
  --font-sans: InterVariable;
}

@layer base {
  html {
    --background-color-ignored: red;
  }
}`);

    expect(tokens.map((token) => token.className)).toEqual([
      'bg-surface',
      'text-on-danger',
      'fill-surface',
      'decoration-muted',
      'ring-offset-surface',
    ]);
    expect(tokens[2]?.alias).toBe('bg-surface');
    expect(tokens[3]?.alias).toBeUndefined();
    expect(tokens[1] && familyOf(tokens[1])).toBe('danger');
    expect(tokens[1] && tierOf(tokens[1], 'danger')).toBe('on');
  });

  it('gives every family the same tiers in theme.css', () => {
    const tokens = parseThemeTokens(themeCss);
    const tiers = (family: (typeof FAMILIES)[number], utility: string) =>
      tokens
        .filter(
          (token) => token.utility === utility && familyOf(token) === family,
        )
        .map((token) => tierOf(token, family))
        .filter((tier) => tier !== 'hover' && tier !== 'pressed')
        .sort();

    for (const utility of ['bg', 'text', 'border', 'fill', 'ring']) {
      const expected = tiers('accent', utility);
      expect(expected.length).toBeGreaterThan(0);
      for (const family of FAMILIES) {
        expect(tiers(family, utility)).toEqual(expected);
      }
    }
  });

  it('only aliases tokens that exist', () => {
    const tokens = parseThemeTokens(themeCss);
    const aliasing = tokens.filter((token) =>
      /^var\(--(?!color-)/.test(token.value),
    );
    expect(aliasing.length).toBeGreaterThan(0);
    for (const token of aliasing) {
      expect(token.alias).toBeDefined();
    }
  });
});
