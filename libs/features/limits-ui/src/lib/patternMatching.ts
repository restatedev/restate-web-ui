// Limit-rule pattern matching, mirroring the Restate Rust limiter
// (crates/limiter/src/rule.rs, rule_store.rs) 1:1.
//
// - A pattern is 1–3 `/`-separated components; count → level (1=scope, 2=L1,
//   3=L2). Each component is an exact value or `*` (wildcard).
// - An input key is a scope plus optional l1 and l2.
// - Same-depth only: an L1 rule needs the key to have an l1; an L2 rule needs
//   l1 AND l2.
// - Exact must equal the input; wildcard always matches.
// - Precedence is a 3-bit score by position (scope=4, l1=2, l2=1); an exact
//   component sets its bit, a wildcard contributes 0. Higher wins, so exact >
//   wildcard and scope-specificity outranks l1 outranks l2.
// - Resolution is per level independently: for a key you resolve up to three
//   governing rules (highest-scoring scope-, L1- and L2-level rule).

export type PatternComp = '*' | { exact: string };
export type PatternLevel = 0 | 1 | 2; // 0 = scope, 1 = l1, 2 = l2

export interface ParsedPattern<T = unknown> {
  raw: string;
  level: PatternLevel;
  scope: PatternComp;
  l1?: PatternComp;
  l2?: PatternComp;
  payload?: T;
}

export interface LimitKey {
  scope: string;
  l1?: string;
  l2?: string;
}

// Position weights — do not change (must match the Rust bitset).
const BIT = { scope: 4, l1: 2, l2: 1 } as const;

function toComp(part: string): PatternComp {
  const trimmed = part.trim();
  return trimmed === '*' ? '*' : { exact: trimmed };
}

// Split into 1–3 non-empty components, tolerating one trailing slash
// (mirrors Rust's split_terminator). Returns null for invalid input.
function splitComponents(raw: string): string[] | null {
  const parts = raw.trim().split('/');
  if (parts.length > 1 && parts[parts.length - 1] === '') {
    parts.pop();
  }
  if (parts.length < 1 || parts.length > 3) {
    return null;
  }
  if (parts.some((part) => part.trim() === '')) {
    return null;
  }
  return parts;
}

export function parsePattern<T>(
  raw: string,
  payload?: T,
): ParsedPattern<T> | null {
  const parts = splitComponents(raw);
  if (!parts) {
    return null;
  }
  const comps = parts.map(toComp);
  const [scope, l1, l2] = comps;
  if (scope === undefined) {
    return null;
  }
  if (comps.length === 1) {
    return { raw, level: 0, scope, payload };
  }
  if (comps.length === 2) {
    return { raw, level: 1, scope, l1, payload };
  }
  return { raw, level: 2, scope, l1, l2, payload };
}

// Parse a concrete key "scope[/l1[/l2]]" (components are literal values, no
// wildcard semantics). Returns null for invalid input.
export function parseKey(input: string): LimitKey | null {
  const parts = splitComponents(input);
  if (!parts) {
    return null;
  }
  const [scope, l1, l2] = parts.map((part) => part.trim());
  if (scope === undefined) {
    return null;
  }
  return { scope, l1, l2 };
}

export function formatKey(key: LimitKey): string {
  return [key.scope, key.l1, key.l2]
    .filter((part): part is string => part !== undefined && part !== '')
    .join('/');
}

function compRank(
  comp: PatternComp,
  input: string,
  bit: number,
): number | null {
  if (comp === '*') {
    return 0;
  }
  return comp.exact === input ? bit : null;
}

// Precedence score, or null if the rule does not apply to this key.
export function rankPattern(rule: ParsedPattern, key: LimitKey): number | null {
  if (rule.level >= 1 && key.l1 === undefined) {
    return null; // same-depth requirement
  }
  if (rule.level === 2 && key.l2 === undefined) {
    return null;
  }
  const s = compRank(rule.scope, key.scope, BIT.scope);
  if (s === null) {
    return null;
  }
  if (rule.level === 0) {
    return s;
  }
  if (!rule.l1 || key.l1 === undefined) {
    return null;
  }
  const a = compRank(rule.l1, key.l1, BIT.l1);
  if (a === null) {
    return null;
  }
  if (rule.level === 1) {
    return s | a;
  }
  if (!rule.l2 || key.l2 === undefined) {
    return null;
  }
  const b = compRank(rule.l2, key.l2, BIT.l2);
  if (b === null) {
    return null;
  }
  return s | a | b;
}

export function ruleApplies(rule: ParsedPattern, key: LimitKey): boolean {
  return rankPattern(rule, key) !== null;
}

// Highest-scoring rule among rules defined AT `level` — one governing "match".
export function resolveAtLevel<T>(
  rules: ParsedPattern<T>[],
  key: LimitKey,
  level: PatternLevel,
): ParsedPattern<T> | null {
  let best: ParsedPattern<T> | null = null;
  let bestRank = -1;
  for (const rule of rules) {
    if (rule.level !== level) {
      continue;
    }
    const rank = rankPattern(rule, key);
    if (rank !== null && rank > bestRank) {
      bestRank = rank;
      best = rule;
    }
  }
  return best;
}

// The governing rule per level the key reaches (up to 3).
export function matchingRules<T>(rules: ParsedPattern<T>[], key: LimitKey) {
  return {
    scope: resolveAtLevel(rules, key, 0),
    l1: key.l1 !== undefined ? resolveAtLevel(rules, key, 1) : null,
    l2: key.l2 !== undefined ? resolveAtLevel(rules, key, 2) : null,
  };
}

export interface KeyAnalysis {
  // Patterns (raw) that apply to the key at any level.
  applicable: Set<string>;
  // Patterns (raw) that win at their level (the governing rules).
  winners: Set<string>;
  byLevel: {
    scope: string | null;
    l1: string | null;
    l2: string | null;
  };
}

export function analyzeKey<T>(
  rules: ParsedPattern<T>[],
  key: LimitKey,
): KeyAnalysis {
  const applicable = new Set<string>();
  for (const rule of rules) {
    if (rankPattern(rule, key) !== null) {
      applicable.add(rule.raw);
    }
  }
  const governing = matchingRules(rules, key);
  const winners = new Set<string>();
  for (const rule of [governing.scope, governing.l1, governing.l2]) {
    if (rule) {
      winners.add(rule.raw);
    }
  }
  return {
    applicable,
    winners,
    byLevel: {
      scope: governing.scope?.raw ?? null,
      l1: governing.l1?.raw ?? null,
      l2: governing.l2?.raw ?? null,
    },
  };
}

// Pattern → its component strings for display (e.g. ["scope", "*", "bar"]).
export function patternComponents(raw: string): string[] {
  const parts = splitComponents(raw);
  return parts ?? [raw];
}

export const PATTERN_LEVEL_LABEL: Record<PatternLevel, string> = {
  0: 'Scope',
  1: 'L1',
  2: 'L2',
};
