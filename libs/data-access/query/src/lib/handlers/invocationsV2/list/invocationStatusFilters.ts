import type { FilterItem } from '@restate/data-access/admin-api-spec';
import {
  getInvocationListFieldOnTable,
  type InvocationListField,
} from '../invocationListFields';
import { filterToSql, sqlStringList, type InvocationFilterV2 } from '../shared';
import {
  INVOCATION_STATUS_DEFINITIONS,
  INVOCATION_STATUSES,
  TERMINAL_INVOCATION_STATUSES,
  type InvocationStatus,
} from '../../../invocationStatuses';

type InvocationFilterSource =
  | { type: 'invocation'; alias: string }
  | {
      type: 'invocation-status';
      alias: string;
      stateAlias: string;
    };

const KILLED_FAILURES = ['[409] killed'];
const CANCELLED_FAILURES = ['[409] canceled', '[409] cancelled'];

function statusValues(filter: FilterItem): string[] {
  if (filter.type === 'STRING_LIST') return filter.value;
  if (filter.type === 'STRING' && filter.value !== undefined) {
    return [filter.value];
  }
  return [];
}

function terminalStatusClause(status: string, alias: string): string {
  const completed = `${alias}.status = 'completed'`;
  const failed = `${alias}.completion_result = 'failure'`;
  const normalizedFailure = `LOWER(${alias}.completion_failure)`;

  switch (status) {
    case 'succeeded':
      return `(${completed} AND ${alias}.completion_result = 'success')`;
    case 'killed':
      return `(${completed} AND ${failed} AND ${normalizedFailure} IN (${sqlStringList(KILLED_FAILURES)}))`;
    case 'cancelled':
      return `(${completed} AND ${failed} AND ${normalizedFailure} IN (${sqlStringList(CANCELLED_FAILURES)}))`;
    default:
      return `(${completed} AND ${failed} AND COALESCE(${normalizedFailure}, '') NOT IN (${sqlStringList([...KILLED_FAILURES, ...CANCELLED_FAILURES])}))`;
  }
}

function statusClause(status: string, source: InvocationFilterSource): string {
  if (
    TERMINAL_INVOCATION_STATUSES.includes(
      status as (typeof TERMINAL_INVOCATION_STATUSES)[number],
    )
  ) {
    return terminalStatusClause(status, source.alias);
  }

  if (source.type === 'invocation') {
    return `${source.alias}.status = '${status}'`;
  }

  switch (status) {
    case 'pending':
      return `${source.alias}.status = 'inboxed'`;
    case 'running':
      return `${source.alias}.status = 'invoked' AND ${source.stateAlias}.in_flight`;
    case 'backing-off':
      return `${source.alias}.status = 'invoked' AND ${source.stateAlias}.in_flight IS NOT TRUE AND ${source.stateAlias}.retry_count > 0`;
    case 'ready':
      return `${source.alias}.status = 'invoked' AND ${source.stateAlias}.in_flight IS NOT TRUE AND COALESCE(${source.stateAlias}.retry_count, 0) = 0`;
    default:
      return `${source.alias}.status = '${INVOCATION_STATUS_DEFINITIONS[status as InvocationStatus]?.sysInvocationStatus ?? status}'`;
  }
}

function durableStatusClause(status: InvocationStatus, alias: string) {
  if (
    TERMINAL_INVOCATION_STATUSES.includes(
      status as (typeof TERMINAL_INVOCATION_STATUSES)[number],
    )
  ) {
    return terminalStatusClause(status, alias);
  }
  const storedStatus =
    INVOCATION_STATUS_DEFINITIONS[status].sysInvocationStatus;
  return storedStatus ? `${alias}.status = '${storedStatus}'` : 'FALSE';
}

/** Returns the exact durable-status predicate for one status-class branch. */
export function invocationStatusPredicate(
  statuses: readonly InvocationStatus[],
  alias: string,
): string {
  const clauses = statuses.map((status) => durableStatusClause(status, alias));
  return clauses.length === 1
    ? (clauses[0] ?? 'FALSE')
    : `(${clauses.join(' OR ')})`;
}

export function statusFilterClause(
  filter: FilterItem,
  source: InvocationFilterSource,
): string {
  const values = statusValues(filter);
  if (filter.operation === 'EQUALS' || filter.operation === 'IN') {
    return `(${values.map((status) => `(${statusClause(status, source)})`).join(' OR ')})`;
  }
  return `(${values.map((status) => `((${statusClause(status, source)}) IS NOT TRUE)`).join(' AND ')})`;
}

function rawStatusPrefilter(
  filter: FilterItem,
  alias: string,
): string | undefined {
  const selected = new Set(statusValues(filter));
  if (filter.operation === 'EQUALS' || filter.operation === 'IN') {
    const rawStatuses = [
      ...new Set(
        [...selected]
          .map(
            (status) =>
              INVOCATION_STATUS_DEFINITIONS[status as InvocationStatus]
                ?.sysInvocationStatus,
          )
          .filter((status): status is string => Boolean(status)),
      ),
    ];
    return rawStatuses.length
      ? `${alias}.status IN (${sqlStringList(rawStatuses)})`
      : undefined;
  }

  const excludedRawStatuses = [
    ...new Set(
      INVOCATION_STATUSES.map(
        (status) => INVOCATION_STATUS_DEFINITIONS[status].sysInvocationStatus,
      ).filter((status): status is string => Boolean(status)),
    ),
  ].filter((rawStatus) =>
    INVOCATION_STATUSES.filter(
      (status) =>
        INVOCATION_STATUS_DEFINITIONS[status].sysInvocationStatus === rawStatus,
    ).every((status) => selected.has(status)),
  );
  return excludedRawStatuses.length
    ? `${alias}.status NOT IN (${sqlStringList(excludedRawStatuses)})`
    : undefined;
}

export function fieldFilterClause(
  filter: FilterItem,
  source: { alias: string },
): string | undefined {
  const tableField = getInvocationListFieldOnTable(
    filter.field,
    'sys_invocation_status',
  );
  if (!tableField) return undefined;
  const column = `${source.alias}.${tableField.column}`;
  const clause = filterToSql(filter, column);
  if (
    filter.field === 'deployment' &&
    clause &&
    (filter.operation === 'NOT_EQUALS' || filter.operation === 'NOT_IN')
  ) {
    // SQL excludes NULL from negative comparisons. A NULL deployment means
    // "not pinned", so it should match NOT_EQUALS and NOT_IN filters.
    return `(${clause} OR ${column} IS NULL)`;
  }
  return clause;
}

export function invocationStatusColumnName(field: InvocationListField) {
  return (
    getInvocationListFieldOnTable(field, 'sys_invocation_status')?.column ??
    field
  );
}

export function invocationStatusColumnForField(
  field: InvocationListField,
  alias: string,
) {
  return `${alias}.${invocationStatusColumnName(field)}`;
}

/** Returns non-status predicates evaluated by `sys_invocation_status`. */
export function invocationStatusFilterClauses(
  filters: InvocationFilterV2[],
  alias: string,
) {
  const source = { alias };
  return (filters as FilterItem[])
    .filter((filter) => filter.field !== 'status')
    .map((filter) => fieldFilterClause(filter, source))
    .filter((clause): clause is string => Boolean(clause));
}

/**
 * Returns a WHERE clause for a candidate query over
 * `sys_invocation_status`, optionally joined to `sys_invocation_state`.
 * Deployment always means pinned deployment in V2.
 */
export function invocationStatusWhere(
  filters: InvocationFilterV2[],
  invocationStatusAlias: string,
  invocationStateAlias: string,
): string {
  const source: InvocationFilterSource = {
    type: 'invocation-status',
    alias: invocationStatusAlias,
    stateAlias: invocationStateAlias,
  };
  const clauses = filters.flatMap((filter) => {
    if (filter.field !== 'status') {
      const clause = fieldFilterClause(filter as FilterItem, source);
      return clause ? [clause] : [];
    }
    const raw = rawStatusPrefilter(filter as FilterItem, invocationStatusAlias);
    return [raw, statusFilterClause(filter as FilterItem, source)].filter(
      (clause): clause is string => Boolean(clause),
    );
  });
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}
