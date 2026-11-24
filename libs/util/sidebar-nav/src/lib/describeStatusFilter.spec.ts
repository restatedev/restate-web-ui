import { describe, expect, it } from 'vitest';
import { describeStatusFilter } from './describeStatusFilter';

function status(operation: 'IN' | 'NOT_IN', value: string[]) {
  return JSON.stringify({ operation, value });
}

describe('describeStatusFilter', () => {
  it('does not reuse a preset name for the same statuses written another way', () => {
    expect(
      describeStatusFilter(
        status('NOT_IN', [
          'scheduled',
          'new',
          'yielded',
          'ready',
          'backing-off',
          'running',
          'suspended',
          'paused',
        ]),
      ),
    ).toBe('4 statuses');
    expect(
      describeStatusFilter(
        status('IN', [
          'scheduled',
          'new',
          'yielded',
          'ready',
          'backing-off',
          'running',
          'suspended',
          'paused',
        ]),
      ),
    ).toBe('8 statuses');
  });

  it('names the inbox stage', () => {
    expect(
      describeStatusFilter(
        status('IN', ['scheduled', 'new', 'yielded', 'ready', 'backing-off']),
      ),
    ).toBe('Inbox');
  });

  it('reads the old Pending name as New', () => {
    expect(describeStatusFilter(status('IN', ['pending']))).toBe('New');
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
