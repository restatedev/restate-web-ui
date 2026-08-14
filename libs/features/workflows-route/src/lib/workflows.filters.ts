import type { components } from '@restate/data-access/admin-api-spec';
import {
  QueryClause,
  readFilterClauses,
  type QueryClauseSchema,
  type QueryClauseType,
  writeFilterClauses,
} from '@restate/ui/filter-builder';

type WorkflowRunFilterItem = components['schemas']['WorkflowRunFilterItem'];

const workflowIdFilterSchema = {
  id: 'id',
  label: 'Workflow ID',
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

export const WORKFLOW_FILTER_SCHEMA = [
  workflowIdFilterSchema,
  scopeFilterSchema,
] satisfies QueryClauseSchema<QueryClauseType>[];

export function workflowFilterSchema(includeScope: boolean) {
  return includeScope
    ? WORKFLOW_FILTER_SCHEMA
    : WORKFLOW_FILTER_SCHEMA.filter(({ id }) => id !== 'scope');
}

export function createWorkflowIdFilter(input: string) {
  const value = input.trim();
  return value
    ? new QueryClause(workflowIdFilterSchema, {
        operation: 'CONTAINS',
        value,
      })
    : undefined;
}

export function readWorkflowFilters(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
) {
  const clauses = readFilterClauses(searchParams, schema);
  if (clauses.length > 0) return clauses;
  const legacyFilter = createWorkflowIdFilter(searchParams.get('q') ?? '');
  return legacyFilter ? [legacyFilter] : [];
}

export function writeWorkflowFilters(
  searchParams: URLSearchParams,
  clauses: QueryClause<QueryClauseType>[],
) {
  const next = writeFilterClauses(searchParams, clauses);
  next.delete('q');
  return next;
}

export function toWorkflowFilters(clauses: QueryClause<QueryClauseType>[]) {
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
      } as WorkflowRunFilterItem,
    ];
  });
}
