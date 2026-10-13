import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import { convertFilters, convertInvocationsFilters } from './convertFilters';

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

  it('filters invocations by their VQueue stage membership', () => {
    const filters: FilterItem[] = [
      {
        field: 'vqueue_id',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'vq_orders',
      },
      {
        field: 'stage',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'inbox',
      },
    ];

    expect(convertInvocationsFilters(filters)).toBe(
      `WHERE "vqueue_id" = 'vq_orders' AND id IN (SELECT entry_id FROM sys_vqueues WHERE stage = 'inbox')`,
    );
  });

  it('matches nothing for an empty status IN list', () => {
    expect(
      convertInvocationsFilters([
        { field: 'status', type: 'STRING_LIST', operation: 'IN', value: [] },
      ]),
    ).toBe('WHERE FALSE');
  });
});

describe('convertFilters', () => {
  it('escapes quotes in string, list and pattern values', () => {
    expect(
      convertFilters([
        {
          field: 'service_key',
          type: 'STRING',
          operation: 'EQUALS',
          value: "qa'key%_1013",
        },
        {
          field: 'scope',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ["a'b", 'c'],
        },
        {
          field: 'key',
          type: 'STRING',
          operation: 'CONTAINS',
          value: "it's",
        },
      ]),
    ).toBe(
      `WHERE "service_key" = 'qa''key%_1013' AND scope IN ('a''b', 'c') AND "key" LIKE '%it''s%'`,
    );
  });

  it('turns empty lists into constant predicates', () => {
    expect(
      convertFilters([
        { field: 'scope', type: 'STRING_LIST', operation: 'IN', value: [] },
        { field: 'key', type: 'STRING_LIST', operation: 'NOT_IN', value: [] },
      ]),
    ).toBe('WHERE FALSE AND TRUE');
  });
});
