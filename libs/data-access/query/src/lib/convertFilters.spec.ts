import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import { convertInvocationsFilters } from './convertFilters';

describe('convertInvocationsFilters', () => {
  it('avoids service-key partition pushdown when filtering by scope', () => {
    const filters: FilterItem[] = [
      {
        field: 'target_service_name',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'QueuedStateObject02',
      },
      {
        field: 'target_service_key',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'backoff-lock',
      },
      {
        field: 'scope',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'vo-b',
      },
    ];

    expect(convertInvocationsFilters(filters)).toBe(
      `WHERE "target_service_name" = 'QueuedStateObject02' AND SUBSTR(target_service_key, 1) = 'backoff-lock' AND "scope" = 'vo-b'`,
    );
  });

  it('retains the direct service-key predicate without a scope filter', () => {
    const filters: FilterItem[] = [
      {
        field: 'target_service_key',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'backoff-lock',
      },
    ];

    expect(convertInvocationsFilters(filters)).toBe(
      `WHERE "target_service_key" = 'backoff-lock'`,
    );
  });
});
