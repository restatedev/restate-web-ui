import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  deduplicateFilters,
  friendlyOperationLabel,
  toInvocationV2SummaryFilter,
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

describe('toInvocationV2SummaryFilter', () => {
  it('expands the legacy completed status to terminal V2 statuses', () => {
    expect(
      toInvocationV2SummaryFilter({
        field: 'status',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'completed',
      }),
    ).toEqual({
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: ['succeeded', 'failed', 'cancelled', 'killed'],
    });
  });

  it('expands completed inside a legacy status exclusion', () => {
    expect(
      toInvocationV2SummaryFilter({
        field: 'status',
        type: 'STRING_LIST',
        operation: 'NOT_IN',
        value: ['paused', 'completed'],
      }),
    ).toEqual({
      field: 'status',
      type: 'STRING_LIST',
      operation: 'NOT_IN',
      value: ['paused', 'succeeded', 'failed', 'cancelled', 'killed'],
    });
  });
});
