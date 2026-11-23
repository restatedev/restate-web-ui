import { describe, expect, it } from 'vitest';
import { describeStatusFilter } from './describeStatusFilter';

function status(operation: 'IN' | 'NOT_IN', value: string[]) {
  return JSON.stringify({ operation, value });
}

describe('describeStatusFilter', () => {
  it('names everything that is not finished', () => {
    expect(
      describeStatusFilter(
        status('NOT_IN', ['succeeded', 'failed', 'cancelled', 'killed']),
      ),
    ).toBe('Not completed');
  });

  it('names a whole stage after the stage', () => {
    expect(
      describeStatusFilter(
        status('IN', [
          'scheduled',
          'pending',
          'yielded',
          'ready',
          'backing-off',
        ]),
      ),
    ).toBe('Inbox');
  });

  it('names failed, cancelled and killed together as Failed', () => {
    expect(
      describeStatusFilter(status('IN', ['failed', 'cancelled', 'killed'])),
    ).toBe('Failed');
  });

  it('lists one or two statuses by name', () => {
    expect(describeStatusFilter(status('IN', ['paused']))).toBe('Paused');
    expect(describeStatusFilter(status('IN', ['paused', 'backing-off']))).toBe(
      'Backing off, Paused',
    );
  });

  it('counts longer combinations', () => {
    expect(
      describeStatusFilter(status('IN', ['running', 'paused', 'failed'])),
    ).toBe('3 statuses');
  });

  it('returns nothing for a missing or broken filter', () => {
    expect(describeStatusFilter(null)).toBeUndefined();
    expect(describeStatusFilter('not json')).toBeUndefined();
    expect(describeStatusFilter(status('IN', []))).toBeUndefined();
  });
});
