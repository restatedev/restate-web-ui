import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  FAMILIES,
  NAMESPACES,
  familyOf,
  hasDarkTheme,
  parseInternals,
  parseThemeTokens,
  themeScopeCss,
  tierOf,
} from './tokens';

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

  it('reads dark values from the dark theme block', () => {
    const tokens = parseThemeTokens(`@theme static {
  --background-color-surface: var(--color-white);
  --background-color-muted: var(--color-white);
  --fill-surface: var(--background-color-surface);
}

@layer base {
  [data-theme='dark'] {
    --background-color-surface: var(--color-black);
    --fill-surface: var(--background-color-muted);
  }
}`);

    expect(tokens.map((token) => token.darkValue)).toEqual([
      'var(--color-black)',
      'var(--color-white)',
      'var(--background-color-muted)',
    ]);
    expect(tokens[2]?.alias).toBe('bg-surface');
    expect(tokens[2]?.darkAlias).toBe('bg-muted');
  });

  it('only overrides tokens and internals that exist', () => {
    const variables = new Set([
      ...parseThemeTokens(themeCss).map((token) => token.variable),
      ...parseInternals(themeCss).map((internal) => internal.variable),
    ]);
    const dark =
      themeCss.match(/\[data-theme='dark'\]\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    for (const [, variable] of dark.matchAll(/(--[a-z0-9-]+):/g)) {
      expect(variables).toContain(variable);
    }
  });

  it('keeps context internals out of the utility namespaces', () => {
    const internals = parseInternals(`@layer base {
  :root {
    --raised-subtle: var(--background-color-subtle);
  }

  [data-theme='dark'] {
    --raised-subtle: var(--color-white);
  }
}`);
    expect(internals).toEqual([
      {
        variable: '--raised-subtle',
        value: 'var(--background-color-subtle)',
        darkValue: 'var(--color-white)',
      },
    ]);
    for (const internal of parseInternals(themeCss)) {
      expect(
        NAMESPACES.some(({ prefix }) =>
          internal.variable.startsWith(`--${prefix}`),
        ),
      ).toBe(false);
    }
  });

  it('builds light and dark scopes with runtime colors', () => {
    const scopes = themeScopeCss(
      `@theme static {
  --background-color-tint: --alpha(var(--color-black) / 5%);
  --fill-surface: var(--background-color-surface);
}

@layer base {
  :root {
    --sheen: var(--background-color-surface);
  }

  [data-theme='dark'] {
    --background-color-tint: --alpha(var(--color-white) / 6%);
  }
}`,
      { light: '.l', dark: '.d' },
    ).split('\n');
    expect(scopes[0]).toBe(
      '.l{--background-color-tint:color-mix(in oklab, var(--color-black) 5%, transparent);--fill-surface:var(--background-color-surface);--sheen:var(--background-color-surface);}',
    );
    expect(scopes[1]).toContain(
      '--background-color-tint:color-mix(in oklab, var(--color-white) 6%, transparent);}',
    );
    expect(hasDarkTheme('@theme static {\n}')).toBe(false);
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
