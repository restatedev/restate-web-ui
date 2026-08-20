import { QueryClause } from '@restate/ui/filter-builder';
import {
  createVQueueIdFilter,
  getVQueueIdFilterValue,
  toVQueueFilters,
  VQUEUE_FILTER_SCHEMA,
} from './limits.vqueueFilters';

describe('VQueue filters', () => {
  it('infers only trimmed VQueue IDs', () => {
    expect(getVQueueIdFilterValue('  vq_123  ')).toBe('vq_123');
    expect(getVQueueIdFilterValue('Checkout')).toBeUndefined();
  });

  it('creates the inferred VQueue ID filter', () => {
    expect(toVQueueFilters([createVQueueIdFilter('vq_123')])).toEqual([
      {
        field: 'id',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'vq_123',
      },
    ]);
  });

  it('maps exact L1 and L2 segment filters', () => {
    const l1Schema = getSchema('l1');
    const l2Schema = getSchema('l2');
    const clauses = [
      new QueryClause(l1Schema, {
        operation: 'EQUALS',
        value: 'team',
      }),
      new QueryClause(l2Schema, {
        operation: 'EQUALS',
        value: 'eu',
      }),
    ];

    expect(toVQueueFilters(clauses)).toEqual([
      {
        field: 'l1',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'team',
      },
      {
        field: 'l2',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'eu',
      },
    ]);
  });

  it('supports literal contains for scope and the whole limit key', () => {
    const scopeSchema = getSchema('scope');
    const limitKeySchema = getSchema('limitKey');
    const clauses = [
      new QueryClause(scopeSchema, {
        operation: 'CONTAINS',
        value: 'acme',
      }),
      new QueryClause(limitKeySchema, {
        operation: 'CONTAINS',
        value: 'team/eu',
      }),
    ];

    expect(toVQueueFilters(clauses)).toEqual([
      {
        field: 'scope',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'acme',
      },
      {
        field: 'limitKey',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'team/eu',
      },
    ]);
  });

  it('supports exact matching for the whole limit key', () => {
    const schema = getSchema('limitKey');
    const clause = new QueryClause(schema, {
      operation: 'EQUALS',
      value: 'team/eu',
    });

    expect(toVQueueFilters([clause])).toEqual([
      {
        field: 'limitKey',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'team/eu',
      },
    ]);
  });

  it('supports exact matching for a service lock', () => {
    const schema = getSchema('lockName');
    const clause = new QueryClause(schema, {
      operation: 'EQUALS',
      value: 'Counter/customer-1',
    });

    expect(toVQueueFilters([clause])).toEqual([
      {
        field: 'lockName',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'Counter/customer-1',
      },
    ]);
  });

  it('ignores operations that are not allowed by a field schema', () => {
    const schema = getSchema('id');
    const clause = new QueryClause(schema, {
      operation: 'CONTAINS',
      value: 'vq_123',
    });

    expect(toVQueueFilters([clause])).toEqual([]);
  });
});

function getSchema(id: string) {
  const schema = VQUEUE_FILTER_SCHEMA.find((candidate) => candidate.id === id);
  if (!schema) {
    throw new Error(`Unknown VQueue filter schema: ${id}`);
  }
  return schema;
}
