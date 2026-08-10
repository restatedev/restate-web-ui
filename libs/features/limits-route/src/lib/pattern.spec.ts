import { describe, expect, it } from 'vitest';
import { parseConcreteKey, patternMatchesKey } from './pattern';

describe('patternMatchesKey', () => {
  it.each([
    ['acme', ['acme'], true],
    ['acme', ['acme', 'team'], true],
    ['acme', ['other', 'team'], false],
    ['*/shared', ['acme', 'shared'], true],
    ['*/shared', ['acme', 'shared', 'member'], true],
    ['*/shared', ['acme', 'private'], false],
    ['*/shared', ['acme'], false],
    ['acme/team/*', ['acme', 'team', 'member'], true],
    ['acme/team/*', ['acme', 'other', 'member'], false],
    ['acme/team/*', ['acme', 'team'], false],
  ])('matches %s against %j as %s', (pattern, key, expected) => {
    expect(patternMatchesKey(pattern, key as string[])).toBe(expected);
  });

  it('normalizes a concrete key before matching', () => {
    const key = parseConcreteKey(' acme / team / member ');

    expect(key).toEqual(['acme', 'team', 'member']);
    expect(key && patternMatchesKey('acme/*/member', key)).toBe(true);
  });

  it.each(['acme/*', 'acme//member', 'acme/team/member/extra'])(
    'rejects non-concrete key %s',
    (key) => {
      expect(parseConcreteKey(key)).toBeNull();
    },
  );
});
