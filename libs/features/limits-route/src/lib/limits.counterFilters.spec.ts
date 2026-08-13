import { QueryClause } from '@restate/ui/filter-builder';
import {
  LIMIT_COUNTER_FILTER_SCHEMA,
  toLimitCounterFilters,
} from './limits.counterFilters';

describe('limit counter filters', () => {
  it('maps scope and whole limit-key searches', () => {
    const clauses = [
      new QueryClause(getSchema('scope'), {
        operation: 'CONTAINS',
        value: 'acme',
      }),
      new QueryClause(getSchema('limitKey'), {
        operation: 'EQUALS',
        value: 'team/eu',
      }),
    ];

    expect(toLimitCounterFilters(clauses)).toEqual([
      {
        field: 'scope',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'acme',
      },
      {
        field: 'limitKey',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'team/eu',
      },
    ]);
  });

  it('maps exact L1 and L2 segment filters', () => {
    const clauses = [
      new QueryClause(getSchema('l1'), {
        operation: 'EQUALS',
        value: 'team',
      }),
      new QueryClause(getSchema('l2'), {
        operation: 'EQUALS',
        value: 'eu',
      }),
    ];

    expect(toLimitCounterFilters(clauses)).toEqual([
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

  it('ignores operations that are not allowed by the schema', () => {
    const clause = new QueryClause(getSchema('l1'), {
      operation: 'CONTAINS',
      value: 'team',
    });

    expect(toLimitCounterFilters([clause])).toEqual([]);
  });
});

function getSchema(id: string) {
  const schema = LIMIT_COUNTER_FILTER_SCHEMA.find(
    (candidate) => candidate.id === id,
  );
  if (!schema) {
    throw new Error(`Unknown limit counter filter schema: ${id}`);
  }
  return schema;
}
