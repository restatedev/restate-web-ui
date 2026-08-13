import {
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
} from './FilterBuilder';
import {
  FILTER_QUERY_PREFIX,
  readFilterClauses,
  writeFilterClauses,
} from './url';

const schema = [
  {
    id: 'service',
    label: 'Service',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
  {
    id: 'limitKey',
    label: 'Limit key',
    operations: [
      { value: 'EQUALS', label: 'is' },
      { value: 'CONTAINS', label: 'contains' },
    ],
    type: 'STRING',
  },
] satisfies QueryClauseSchema<QueryClauseType>[];

describe('filter URL state', () => {
  it('replaces filter parameters and preserves unrelated parameters', () => {
    const service = new QueryClause(getSchema('service'), {
      operation: 'EQUALS',
      value: 'Checkout',
    });
    const searchParams = new URLSearchParams(
      `tab=vqueues&${FILTER_QUERY_PREFIX}stale=old`,
    );

    const nextSearchParams = writeFilterClauses(searchParams, [service]);

    expect(nextSearchParams.get('tab')).toBe('vqueues');
    expect(nextSearchParams.has(`${FILTER_QUERY_PREFIX}stale`)).toBe(false);
    expect(nextSearchParams.get(`${FILTER_QUERY_PREFIX}service`)).toBe(
      String(service),
    );
  });

  it('round-trips supported operations', () => {
    const limitKey = new QueryClause(getSchema('limitKey'), {
      operation: 'CONTAINS',
      value: 'team/eu',
    });

    const clauses = readFilterClauses(
      writeFilterClauses(new URLSearchParams(), [limitKey]),
      schema,
    );

    expect(clauses).toHaveLength(1);
    expect(clauses[0]?.value).toEqual({
      operation: 'CONTAINS',
      value: 'team/eu',
      fieldValue: undefined,
    });
  });

  it('does not serialize incomplete filters', () => {
    const service = new QueryClause(getSchema('service'), {
      operation: 'EQUALS',
      value: '',
    });

    const searchParams = writeFilterClauses(new URLSearchParams(), [service]);

    expect(searchParams.toString()).toBe('');
  });
});

function getSchema(id: string) {
  const clauseSchema = schema.find((candidate) => candidate.id === id);
  if (!clauseSchema) {
    throw new Error(`Unknown filter schema: ${id}`);
  }
  return clauseSchema;
}
