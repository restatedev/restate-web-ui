import { QueryClauseSchema, QueryClauseType } from '@restate/ui/filter-builder';

export const LIMIT_IDENTITY_FILTER_SCHEMA = [
  {
    id: 'scope',
    label: 'Scope',
    operations: [
      { value: 'EQUALS', label: 'is' },
      { value: 'CONTAINS', label: 'contains' },
    ],
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
  {
    id: 'l1',
    label: 'Limit key · L1',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
  {
    id: 'l2',
    label: 'Limit key · L2',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'STRING',
  },
] satisfies QueryClauseSchema<QueryClauseType>[];
