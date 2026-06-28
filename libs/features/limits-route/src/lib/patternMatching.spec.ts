import { describe, expect, it } from 'vitest';
import {
  analyzeKey,
  matchingRules,
  parseKey,
  parsePattern,
  rankPattern,
  type ParsedPattern,
} from './patternMatching';

function parse(raw: string): ParsedPattern {
  const p = parsePattern(raw);
  if (!p) {
    throw new Error(`failed to parse ${raw}`);
  }
  return p;
}

describe('parsePattern', () => {
  it('parses levels and tolerates one trailing slash', () => {
    expect(parse('hotel').level).toBe(0);
    expect(parse('hotel/*').level).toBe(1);
    expect(parse('hotel/*/eu').level).toBe(2);
    expect(parse('hotel/').level).toBe(0);
  });

  it('rejects invalid patterns', () => {
    expect(parsePattern('')).toBeNull();
    expect(parsePattern('a/b/c/d')).toBeNull();
    expect(parsePattern('a//b')).toBeNull();
  });
});

describe('rankPattern (mirrors Rust l2_ranking test)', () => {
  const key = { scope: 'scope1', l1: 'org1', l2: 'tenant1' };
  const cases: Array<[string, number | null]> = [
    ['*/*/*', 0],
    ['*/*/tenant1', 1],
    ['*/org1/*', 2],
    ['scope1/*/*', 4],
    ['scope1/org1/*', 6],
    ['scope1/org1/tenant1', 7],
    ['unmatched/org1/tenant1', null],
  ];
  it.each(cases)('%s -> %s', (pattern, score) => {
    expect(rankPattern(parse(pattern), key)).toBe(score);
  });

  it('scope-specificity outranks l1', () => {
    expect(rankPattern(parse('scope1/*/*'), key)).toBeGreaterThan(
      rankPattern(parse('*/org1/*'), key) ?? -1,
    );
  });
});

describe('same-depth requirement', () => {
  it('an L1 rule does not apply to a scope-only key', () => {
    expect(rankPattern(parse('hotel/*'), { scope: 'hotel' })).toBeNull();
  });
  it('a scope rule applies to a deeper key', () => {
    expect(
      rankPattern(parse('hotel'), { scope: 'hotel', l1: 'a', l2: 'b' }),
    ).toBe(4);
  });
});

describe('matchingRules / analyzeKey', () => {
  // One governing rule per component-count level (scope=1 part, l1=2, l2=3).
  const rules = [
    'scope1', // L0 scope rule
    '*', // L0 wildcard scope rule
    'scope1/org1', // L1 rule
    'scope1/org1/tenant1', // L2 rule
    '*/*/*', // L2 wildcard rule
    'other', // L0, does not match
  ].map((raw) => parse(raw));

  it('resolves the governing rule per level', () => {
    const key = { scope: 'scope1', l1: 'org1', l2: 'tenant1' };
    const m = matchingRules(rules, key);
    expect(m.scope?.raw).toBe('scope1'); // exact scope beats '*'
    expect(m.l1?.raw).toBe('scope1/org1');
    expect(m.l2?.raw).toBe('scope1/org1/tenant1'); // beats '*/*/*'
  });

  it('marks winners + applicable set', () => {
    const key = { scope: 'scope1', l1: 'org1', l2: 'tenant1' };
    const a = analyzeKey(rules, key);
    expect(a.winners.has('scope1')).toBe(true);
    expect(a.winners.has('scope1/org1/tenant1')).toBe(true);
    expect(a.applicable.has('*/*/*')).toBe(true);
    expect(a.applicable.has('*')).toBe(true); // applies but doesn't win
    expect(a.winners.has('*')).toBe(false);
    expect(a.applicable.has('other')).toBe(false);
  });
});

describe('parseKey', () => {
  it('parses concrete keys', () => {
    expect(parseKey('hotel')).toEqual({ scope: 'hotel' });
    expect(parseKey('hotel/eu/x')).toEqual({
      scope: 'hotel',
      l1: 'eu',
      l2: 'x',
    });
    expect(parseKey('')).toBeNull();
  });
});
