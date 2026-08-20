import { readFilterClauses } from '@restate/ui/filter-builder';
import { LIMIT_COUNTER_FILTER_SCHEMA } from './limits.counterFilters';
import { VQUEUE_FILTER_SCHEMA } from './limits.vqueueFilters';
import {
  limitCountersForIdentityHref,
  limitRulesForPatternHref,
  vqueuesForLimitCounterHref,
  vqueuesForVirtualObjectInstanceHref,
} from './navigation';
import {
  LIMIT_RULE_FILTER_SCHEMA,
  selectedLimitRulePattern,
} from './limits.ruleFilters';

describe('rule navigation', () => {
  it('filters the Rules page by exact pattern', () => {
    const href = limitRulesForPatternHref('/ui', 'tenant-*/payments/priority');
    const url = new URL(href, 'https://example.com');
    const filters = readFilterClauses(
      url.searchParams,
      LIMIT_RULE_FILTER_SCHEMA,
    );

    expect(url.pathname).toBe('/ui/flow-control/rules');
    expect(selectedLimitRulePattern(filters)).toBe(
      'tenant-*/payments/priority',
    );
    expect(
      filters.map((clause) => [
        clause.id,
        clause.value.operation,
        clause.value.value,
      ]),
    ).toEqual([['pattern', 'EQUALS', 'tenant-*/payments/priority']]);
  });
});

describe('counter VQueue navigation', () => {
  it('filters a scope counter by exact scope', () => {
    expect(readFilters({ scope: 'acme' })).toEqual([
      ['scope', 'EQUALS', 'acme'],
    ]);
  });

  it('filters an L1 counter by exact scope and L1 segment', () => {
    expect(readFilters({ scope: 'acme', l1: 'team' })).toEqual([
      ['scope', 'EQUALS', 'acme'],
      ['l1', 'EQUALS', 'team'],
    ]);
  });

  it('filters an L2 counter by exact scope and whole limit key', () => {
    expect(readFilters({ scope: 'acme', l1: 'team', l2: 'eu' })).toEqual([
      ['scope', 'EQUALS', 'acme'],
      ['limitKey', 'EQUALS', 'team/eu'],
    ]);
  });
});

describe('Virtual Object VQueue navigation', () => {
  it('filters by scoped Virtual Object identity', () => {
    const href = vqueuesForVirtualObjectInstanceHref('/ui', {
      service: 'Counter',
      key: 'customer-1',
      scope: 'tenant-a',
    });

    expect(readVQueueFilters(href)).toEqual([
      ['service', 'EQUALS', 'Counter'],
      ['serviceKey', 'EQUALS', 'customer-1'],
      ['scope', 'EQUALS', 'tenant-a'],
    ]);
  });

  it('filters an unscoped Virtual Object by service and service key', () => {
    const href = vqueuesForVirtualObjectInstanceHref('/ui', {
      service: 'Counter',
      key: 'customer-1',
    });

    expect(readVQueueFilters(href)).toEqual([
      ['service', 'EQUALS', 'Counter'],
      ['serviceKey', 'EQUALS', 'customer-1'],
    ]);
  });
});

describe('blocking counter navigation', () => {
  it('filters the exact L2 counter and its rule', () => {
    const href = limitCountersForIdentityHref(
      '/ui',
      { scope: 'tenant-a', l1: 'payments', l2: 'priority' },
      'tenant-*/payments/priority',
    );
    const url = new URL(href, 'https://example.com');

    expect(url.pathname).toBe('/ui/flow-control/counters');
    expect(url.searchParams.get('rule')).toBe(
      'rule:tenant-*/payments/priority',
    );
    expect(
      readFilterClauses(url.searchParams, LIMIT_COUNTER_FILTER_SCHEMA).map(
        (clause) => [clause.id, clause.value.operation, clause.value.value],
      ),
    ).toEqual([
      ['scope', 'EQUALS', 'tenant-a'],
      ['limitKey', 'EQUALS', 'payments/priority'],
    ]);
  });
});

function readFilters(identity: { scope: string; l1?: string; l2?: string }) {
  const href = vqueuesForLimitCounterHref('/ui', identity);
  return readVQueueFilters(href);
}

function readVQueueFilters(href: string) {
  const url = new URL(href, 'https://example.com');
  expect(url.pathname).toBe('/ui/flow-control/vqueues');
  return readFilterClauses(url.searchParams, VQUEUE_FILTER_SCHEMA).map(
    (clause) => [clause.id, clause.value.operation, clause.value.value],
  );
}
