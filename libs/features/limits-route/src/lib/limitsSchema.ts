import {
  QueryClauseOperation,
  QueryClauseOperationId,
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/query-builder';

// sys_scheduler `blocked_on` reasons → human labels (mirrors the State cell).
export const BLOCKED_ON_OPTIONS = [
  { value: 'limit-key-concurrency', label: 'on rules' },
  { value: 'lock', label: 'on lock' },
  { value: 'invoker-concurrency', label: 'on invoker' },
  { value: 'invoker-throttling', label: 'throttled (invoker)' },
  { value: 'invoker-memory', label: 'on memory' },
  { value: 'throttling-rules', label: 'throttled (rules)' },
  { value: 'deployment-concurrency', label: 'on deployment' },
];

const TEXT_OPS: QueryClauseOperation[] = [
  { value: 'EQUALS', label: 'is' },
  { value: 'CONTAINS', label: 'contains' },
];
const LIST_OPS: QueryClauseOperation[] = [
  { value: 'IN', label: 'is' },
  { value: 'NOT_IN', label: 'is not' },
];
const NUMBER_OPS: QueryClauseOperation[] = [
  { value: 'GREATER_THAN', label: '>' },
  { value: 'EQUALS', label: '=' },
  { value: 'LESS_THAN', label: '<' },
];

// Filter schema for the "Active matches" (counter) tab. Clause ids map directly
// to sys_user_limits columns, so the server builds valid SQL from them.
export const COUNTER_SCHEMA: QueryClauseSchema<QueryClauseType>[] = [
  { id: 'scope', label: 'Scope', operations: TEXT_OPS, type: 'STRING' },
  {
    id: 'l1',
    label: 'Limit key level 1',
    operations: TEXT_OPS,
    type: 'STRING',
  },
  {
    id: 'l2',
    label: 'Limit key level 2',
    operations: TEXT_OPS,
    type: 'STRING',
  },
  {
    id: 'num_waiters',
    label: 'Waiting queues',
    operations: NUMBER_OPS,
    type: 'NUMBER',
  },
  { id: 'usage', label: 'Usage', operations: NUMBER_OPS, type: 'NUMBER' },
  {
    id: 'available',
    label: 'Available',
    operations: NUMBER_OPS,
    type: 'NUMBER',
  },
];

// Filter schema for a target (virtual-queue) tab. Clause ids map to the
// sys_vqueue_meta / sys_scheduler columns the targets query selects.
export const TARGET_SCHEMA: QueryClauseSchema<QueryClauseType>[] = [
  {
    id: 'blocked_on',
    label: 'Blocked on',
    operations: LIST_OPS,
    type: 'STRING_LIST',
    options: BLOCKED_ON_OPTIONS,
  },
  {
    id: 'status',
    label: 'Status',
    operations: LIST_OPS,
    type: 'STRING_LIST',
    options: [
      { value: 'blocked', label: 'Blocked' },
      { value: 'scheduled', label: 'Scheduled' },
    ],
  },
  {
    id: 'service_name',
    label: 'Service',
    operations: TEXT_OPS,
    type: 'STRING',
  },
  { id: 'limit_key', label: 'Limit key', operations: TEXT_OPS, type: 'STRING' },
  { id: 'num_inbox', label: 'Inbox', operations: NUMBER_OPS, type: 'NUMBER' },
  {
    id: 'num_running',
    label: 'Running',
    operations: NUMBER_OPS,
    type: 'NUMBER',
  },
];

export interface SortOption {
  id: string;
  label: string;
}

// Sort fields (must match the server allowlists in the handlers).
export const COUNTER_SORTS: SortOption[] = [
  { id: 'num_waiters', label: 'Waiting queues' },
  { id: 'usage', label: 'Usage' },
  { id: 'available', label: 'Available' },
  { id: 'scope', label: 'Scope' },
  { id: 'l1', label: 'Limit key level 1' },
  { id: 'l2', label: 'Limit key level 2' },
];

export const TARGET_SORTS: SortOption[] = [
  { id: 'head_wait', label: 'Head wait' },
  { id: 'num_inbox', label: 'Inbox' },
  { id: 'num_running', label: 'Running' },
  { id: 'last_finish_at', label: 'Last activity' },
  { id: 'service_name', label: 'Service' },
];

export interface QuickFilterPreset {
  id: string;
  label: string;
  sort?: { field: string; order: 'ASC' | 'DESC' };
  filters: Array<{
    field: string;
    operation: QueryClauseOperationId;
    value?: string | number | string[];
  }>;
}

// Placeholder presets — to be refined later (per the design discussion).
export const COUNTER_PRESETS: QuickFilterPreset[] = [
  { id: 'all', label: 'All', filters: [] },
  {
    id: 'backed-up',
    label: 'Backed up',
    sort: { field: 'num_waiters', order: 'DESC' },
    filters: [{ field: 'num_waiters', operation: 'GREATER_THAN', value: 0 }],
  },
  {
    id: 'over-capacity',
    label: 'Over capacity',
    filters: [{ field: 'available', operation: 'EQUALS', value: 0 }],
  },
];

export const TARGET_PRESETS: QuickFilterPreset[] = [
  { id: 'all', label: 'All', filters: [] },
  {
    id: 'blocked',
    label: 'Blocked',
    sort: { field: 'head_wait', order: 'DESC' },
    filters: [{ field: 'status', operation: 'IN', value: ['blocked'] }],
  },
  {
    id: 'running',
    label: 'Running',
    sort: { field: 'num_running', order: 'DESC' },
    filters: [{ field: 'num_running', operation: 'GREATER_THAN', value: 0 }],
  },
];
