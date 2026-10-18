import {
  INVOCATION_LIST_FIELDS,
  type InvocationListField,
  type InvocationListTable,
} from '../invocationListFields.js';
import { ENTRY_INDEX_FILTER_FIELDS } from './indexedInvocationCandidates.js';

const VQUEUE_TABLES: InvocationListTable[] = [
  'sys_vqueues',
  'sys_vqueue_entry_status',
  'sys_vqueue_meta',
];

function isOnVqueueTable(field: string) {
  const tables: Partial<Record<InvocationListTable, unknown>> | undefined =
    INVOCATION_LIST_FIELDS[field as InvocationListField]?.tables;
  return VQUEUE_TABLES.some((table) => tables?.[table]);
}

export function entryTablesSupportFilters(filterFields: Iterable<string>) {
  return [...filterFields].every(
    (field) => ENTRY_INDEX_FILTER_FIELDS.has(field) || isOnVqueueTable(field),
  );
}
