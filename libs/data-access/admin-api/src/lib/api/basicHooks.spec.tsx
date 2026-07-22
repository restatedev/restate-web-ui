import { describe, expect, it } from 'vitest';
import { hasCompleteVqueueInvocationPopulation } from './basicHooks';

describe('hasCompleteVqueueInvocationPopulation', () => {
  it.each([
    [[], false],
    [['vqueues'], true],
    [['vqueues', 'vqueues_migration_skip_completed'], false],
  ] as const)('returns %s for %s', (features, expected) => {
    expect(hasCompleteVqueueInvocationPopulation(new Set(features))).toBe(
      expected,
    );
  });
});
