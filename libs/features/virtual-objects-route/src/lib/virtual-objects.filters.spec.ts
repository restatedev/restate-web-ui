import { QueryClause } from '@restate/ui/filter-builder';
import {
  createVirtualObjectKeyFilter,
  readVirtualObjectFilters,
  toVirtualObjectFilters,
  VIRTUAL_OBJECT_FILTER_SCHEMA,
  virtualObjectFilterSchema,
  writeVirtualObjectFilters,
} from './virtual-objects.filters';

describe('Virtual Object filters', () => {
  it('creates a contains filter from direct key input', () => {
    const clause = createVirtualObjectKeyFilter('  customer-1  ');

    expect(clause && toVirtualObjectFilters([clause])).toEqual([
      {
        field: 'key',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'customer-1',
      },
    ]);
  });

  it('maps a scope equality clause', () => {
    const scope = VIRTUAL_OBJECT_FILTER_SCHEMA.find(({ id }) => id === 'scope');
    if (!scope) throw new Error('Missing scope filter schema');

    expect(
      toVirtualObjectFilters([
        new QueryClause(scope, {
          operation: 'EQUALS',
          value: 'tenant-a',
        }),
      ]),
    ).toEqual([
      {
        field: 'scope',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'tenant-a',
      },
    ]);
  });

  it('hides scope when scoped Virtual Objects are unavailable', () => {
    expect(virtualObjectFilterSchema(false).map(({ id }) => id)).toEqual([
      'key',
    ]);
  });

  it('surfaces and migrates a legacy search parameter', () => {
    const searchParams = new URLSearchParams({
      service: 'Counter',
      q: 'customer',
    });
    const clauses = readVirtualObjectFilters(
      searchParams,
      VIRTUAL_OBJECT_FILTER_SCHEMA,
    );

    expect(toVirtualObjectFilters(clauses)).toEqual([
      {
        field: 'key',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'customer',
      },
    ]);

    const migrated = writeVirtualObjectFilters(searchParams, clauses);
    expect(migrated.get('service')).toBe('Counter');
    expect(migrated.has('q')).toBe(false);
    expect(migrated.has('filter_key')).toBe(true);
  });
});
