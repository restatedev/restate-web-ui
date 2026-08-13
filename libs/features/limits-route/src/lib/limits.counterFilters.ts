import type { components } from '@restate/data-access/admin-api-spec';
import { QueryClause, QueryClauseType } from '@restate/ui/filter-builder';
import { LIMIT_IDENTITY_FILTER_SCHEMA } from './limits.identityFilters';

type LimitCounterFilterItem = components['schemas']['LimitCounterFilterItem'];

export const LIMIT_COUNTER_FILTER_SCHEMA = LIMIT_IDENTITY_FILTER_SCHEMA;

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
