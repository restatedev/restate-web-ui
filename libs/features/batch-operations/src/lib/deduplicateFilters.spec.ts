import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  deduplicateFilters,
  friendlyOperationLabel,
} from './deduplicateFilters';

describe('friendlyOperationLabel', () => {
  it('uses user-facing operation names', () => {
    expect(friendlyOperationLabel('EQUALS')).toBe('is');
    expect(friendlyOperationLabel('NOT_IN')).toBe('is not');
    expect(friendlyOperationLabel('NOT_CONTAINS')).toBe('does not contain');
  });
});

describe('deduplicateFilters', () => {
  it('collapses equivalent single-value string constraints', () => {
    const filters = [
      {
        field: 'status',
        type: 'STRING_LIST',
        operation: 'IN',
        value: ['backing-off'],
      },
      {
        field: 'status',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'backing-off',
      },
    ] satisfies FilterItem[];

    expect(deduplicateFilters(filters)).toEqual([filters[0]]);
  });

  it('keeps constraints that narrow a multi-value filter', () => {
    const filters = [
      {
        field: 'status',
        type: 'STRING_LIST',
        operation: 'IN',
        value: ['backing-off', 'paused'],
      },
      {
        field: 'status',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'backing-off',
      },
    ] satisfies FilterItem[];

    expect(deduplicateFilters(filters)).toEqual(filters);
  });
});
