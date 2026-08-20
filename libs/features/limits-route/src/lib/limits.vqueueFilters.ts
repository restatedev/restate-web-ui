import type { components } from '@restate/data-access/admin-api-spec';
import {
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/filter-builder';
import { LIMIT_IDENTITY_FILTER_SCHEMA } from './limits.identityFilters';

type VQueueFilterItem = components['schemas']['VQueueFilterItem'];

const vqueueIdFilterSchema = {
  id: 'id',
  label: 'VQueue ID',
  operations: [{ value: 'EQUALS', label: 'is' }],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

const vqueueServiceFilterSchema = {
  id: 'service',
  label: 'Service',
  operations: [{ value: 'EQUALS', label: 'is' }],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

const vqueueLockNameFilterSchema = {
  id: 'lockName',
  label: 'Lock',
  operations: [{ value: 'EQUALS', label: 'is' }],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

export const VQUEUE_FILTER_SCHEMA = [
  vqueueIdFilterSchema,
  vqueueServiceFilterSchema,
  vqueueLockNameFilterSchema,
  ...LIMIT_IDENTITY_FILTER_SCHEMA,
] satisfies QueryClauseSchema<QueryClauseType>[];

export function createVQueueIdFilter(value: string) {
  return new QueryClause(vqueueIdFilterSchema, {
    operation: 'EQUALS',
    value,
  });
}

export function createVQueueFiltersForCounter(identity: {
  scope: string;
  l1?: string;
  l2?: string;
}) {
  const clauses = [createExactVQueueFilter('scope', identity.scope)];
  if (identity.l2) {
    clauses.push(
      identity.l1
        ? createExactVQueueFilter('limitKey', `${identity.l1}/${identity.l2}`)
        : createExactVQueueFilter('l2', identity.l2),
    );
  } else if (identity.l1) {
    clauses.push(createExactVQueueFilter('l1', identity.l1));
  }
  return clauses;
}

export function createVQueueFiltersForVirtualObjectInstance(identity: {
  service: string;
  key: string;
  scope?: string;
}) {
  return [
    ...(identity.scope === undefined
      ? []
      : [createExactVQueueFilter('scope', identity.scope)]),
    createExactVQueueFilter('lockName', `${identity.service}/${identity.key}`),
  ];
}

export function getVQueueIdFilterValue(input: string) {
  const value = input.trim();
  return value.startsWith('vq_') ? value : undefined;
}

export function toVQueueFilters(clauses: QueryClause<QueryClauseType>[]) {
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
      } as VQueueFilterItem,
    ];
  });
}

function createExactVQueueFilter(id: string, value: string) {
  const schema = VQUEUE_FILTER_SCHEMA.find((candidate) => candidate.id === id);
  if (!schema) {
    throw new Error(`Unknown VQueue filter schema: ${id}`);
  }
  return new QueryClause(schema, { operation: 'EQUALS', value });
}
