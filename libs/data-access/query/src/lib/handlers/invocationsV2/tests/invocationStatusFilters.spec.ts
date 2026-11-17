import { describe, expect, it } from 'vitest';
import { invocationStatusPredicate } from '../list/invocationStatusFilters.js';

describe('invocationStatusPredicate', () => {
  it('matches killed invocations in both completion formats', () => {
    expect(invocationStatusPredicate(['killed'], 'ss')).toBe(
      "(ss.status = 'completed' AND (ss.completion_result = 'killed' OR (ss.completion_result = 'failure' AND LOWER(ss.completion_failure) IN ('[409] killed'))))",
    );
  });

  it('matches cancelled invocations by message or by code only', () => {
    expect(invocationStatusPredicate(['cancelled'], 'ss')).toBe(
      "(ss.status = 'completed' AND ss.completion_result = 'failure' AND LOWER(ss.completion_failure) IN ('[409] canceled', '[409] cancelled', '[409]'))",
    );
  });

  it('keeps cancelled and killed invocations out of failed', () => {
    expect(invocationStatusPredicate(['failed'], 'ss')).toBe(
      "(ss.status = 'completed' AND ss.completion_result = 'failure' AND COALESCE(LOWER(ss.completion_failure), '') NOT IN ('[409] killed', '[409] canceled', '[409] cancelled', '[409]'))",
    );
  });
});
