import type { components } from '@restate/data-access/admin-api-spec';
import { QueryClause, QueryClauseType } from '@restate/ui/filter-builder';
import { LIMIT_IDENTITY_FILTER_SCHEMA } from './limits.identityFilters';

type LimitCounterFilterItem = components['schemas']['LimitCounterFilterItem'];

export const LIMIT_COUNTER_FILTER_SCHEMA = LIMIT_IDENTITY_FILTER_SCHEMA;

export function createLimitCounterFiltersForIdentity(identity: {
  scope: string;
  l1?: string;
  l2?: string;
}) {
  const clauses = [createExactLimitCounterFilter('scope', identity.scope)];
  if (identity.l2) {
    clauses.push(
      identity.l1
        ? createExactLimitCounterFilter(
            'limitKey',
            `${identity.l1}/${identity.l2}`,
          )
        : createExactLimitCounterFilter('l2', identity.l2),
    );
  } else if (identity.l1) {
    clauses.push(createExactLimitCounterFilter('l1', identity.l1));
  }
  return clauses;
}

export function toLimitCounterFilters(clauses: QueryClause<QueryClauseType>[]) {
  return clauses.flatMap((clause) => {
    const operation = clause.value.operation;
    if (
      !clause.isValid ||
      !operation ||
      !clause.operations.some((candidate) => candidate.value === operation) ||
      typeof clause.value.value !== 'string'
    ) {
      return [];
    }
    return [
      {
        field: clause.id,
        type: 'STRING',
        operation,
        value: clause.value.value,
      } as LimitCounterFilterItem,
    ];
  });
}

function createExactLimitCounterFilter(id: string, value: string) {
  const schema = LIMIT_COUNTER_FILTER_SCHEMA.find(
    (candidate) => candidate.id === id,
  );
  if (!schema) {
    throw new Error(`Unknown limit counter filter schema: ${id}`);
  }
  return new QueryClause(schema, { operation: 'EQUALS', value });
}
