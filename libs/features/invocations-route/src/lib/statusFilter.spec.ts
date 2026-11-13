import { describe, expect, it } from 'vitest';
import {
  INVOCATION_STATUSES,
  TERMINAL_INVOCATION_STATUSES,
} from '@restate/data-access-admin-api-spec';
import {
  getFocusFromStatusFilter,
  getSelectedFocusFromStatusFilter,
  type StatusFilter,
} from './statusFilter';

const NOT_COMPLETED_STATUSES = INVOCATION_STATUSES.filter(
  (status) => !TERMINAL_INVOCATION_STATUSES.includes(status),
);

function statusFilter(operation: 'IN' | 'NOT_IN', value: string[]) {
  return {
    field: 'status',
    type: 'STRING_LIST',
    operation,
    value,
  } as StatusFilter;
}

describe('getSelectedFocusFromStatusFilter', () => {
  it.each([
    ['no status filter', undefined, 'all'],
    ['an empty status filter', statusFilter('IN', []), 'all'],
    [
      'every status',
      statusFilter('IN', [...INVOCATION_STATUSES].reverse()),
      'all',
    ],
    [
      'Not completed',
      statusFilter('NOT_IN', TERMINAL_INVOCATION_STATUSES),
      'not-completed',
    ],
    [
      'every not-completed status',
      statusFilter('IN', NOT_COMPLETED_STATUSES),
      'not-completed',
    ],
    [
      'Completed',
      statusFilter('IN', TERMINAL_INVOCATION_STATUSES),
      'completed',
    ],
    [
      'every completed status in another order',
      statusFilter('IN', [...TERMINAL_INVOCATION_STATUSES].reverse()),
      'completed',
    ],
    [
      'every not-completed status excluded',
      statusFilter('NOT_IN', NOT_COMPLETED_STATUSES),
      'completed',
    ],
  ])('selects a tab for %s', (_, filter, selected) => {
    expect(getSelectedFocusFromStatusFilter(filter)).toBe(selected);
  });

  it.each([
    ['Running', 'not-completed', statusFilter('IN', ['running'])],
    [
      'In-flight',
      'not-completed',
      statusFilter('NOT_IN', [...TERMINAL_INVOCATION_STATUSES, 'scheduled']),
    ],
    [
      'Held up',
      'not-completed',
      statusFilter('IN', [
        'pending',
        'backing-off',
        'paused',
        'ready',
        'yielded',
      ]),
    ],
    ['one outcome', 'completed', statusFilter('IN', ['succeeded'])],
    [
      'statuses from both lifecycles',
      'all',
      statusFilter('IN', ['running', 'succeeded']),
    ],
    ['no status at all', 'all', statusFilter('NOT_IN', INVOCATION_STATUSES)],
  ])('selects no tab for %s and keeps the %s view', (_, focus, filter) => {
    expect(getSelectedFocusFromStatusFilter(filter)).toBeNull();
    expect(getFocusFromStatusFilter(filter)).toBe(focus);
  });
});
