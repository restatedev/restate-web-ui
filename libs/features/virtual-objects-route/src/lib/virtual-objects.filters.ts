import type { components } from '@restate/data-access/admin-api-spec';
import {
  QueryClause,
  readFilterClauses,
  type QueryClauseSchema,
  type QueryClauseType,
  writeFilterClauses,
} from '@restate/ui/filter-builder';

type VirtualObjectInstanceFilterItem =
  components['schemas']['VirtualObjectInstanceFilterItem'];

const keyFilterSchema = {
  id: 'key',
  label: 'Key',
  operations: [
    { value: 'EQUALS', label: 'is' },
    { value: 'CONTAINS', label: 'contains' },
  ],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

const scopeFilterSchema = {
  id: 'scope',
  label: 'Scope',
  operations: [
    { value: 'EQUALS', label: 'is' },
    { value: 'CONTAINS', label: 'contains' },
  ],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

export const VIRTUAL_OBJECT_FILTER_SCHEMA = [
  keyFilterSchema,
  scopeFilterSchema,
] satisfies QueryClauseSchema<QueryClauseType>[];

export function virtualObjectFilterSchema(includeScope: boolean) {
  return includeScope
    ? VIRTUAL_OBJECT_FILTER_SCHEMA
    : VIRTUAL_OBJECT_FILTER_SCHEMA.filter(({ id }) => id !== 'scope');
}

export function createVirtualObjectKeyFilter(input: string) {
  const value = input.trim();
  return value
    ? new QueryClause(keyFilterSchema, { operation: 'CONTAINS', value })
    : undefined;
}

export function readVirtualObjectFilters(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
) {
  const clauses = readFilterClauses(searchParams, schema);
  if (clauses.length > 0) return clauses;
  const legacyFilter = createVirtualObjectKeyFilter(
    searchParams.get('q') ?? '',
  );
  return legacyFilter ? [legacyFilter] : [];
}

export function writeVirtualObjectFilters(
  searchParams: URLSearchParams,
  clauses: QueryClause<QueryClauseType>[],
) {
  const next = writeFilterClauses(searchParams, clauses);
  next.delete('q');
  return next;
}

export function toVirtualObjectFilters(
  clauses: QueryClause<QueryClauseType>[],
) {
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
      } as VirtualObjectInstanceFilterItem,
    ];
  });
}
