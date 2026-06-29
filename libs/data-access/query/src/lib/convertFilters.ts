import type {
  FilterItem,
  FilterDateItem,
  FilterStringItem,
  FilterNumberItem,
  FilterStringListItem,
  FilterNullItem,
} from '@restate/data-access/admin-api-spec';

function convertFilterNumberToSqlClause(
  filter: FilterNumberItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `${filter.field} = ${filter.value}`;
    case 'NOT_EQUALS':
      return `${filter.field} != ${filter.value}`;
    case 'GREATER_THAN':
      return `${filter.field} > ${filter.value}`;
    case 'LESS_THAN':
      return `${filter.field} < ${filter.value}`;
    case 'GREATER_THAN_OR_EQUAL':
      return `${filter.field} >= ${filter.value}`;
    case 'LESS_THAN_OR_EQUAL':
      return `${filter.field} <= ${filter.value}`;
  }
}

function convertFilterStringToSqlClause(
  filter: FilterStringItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'EQUALS':
      return `"${filter.field}" = '${filter.value}'`;
    case 'NOT_EQUALS':
      return `"${filter.field}" != '${filter.value}'`;
    case 'CONTAINS':
      return `"${filter.field}" LIKE '%${filter.value}%'`;
    case 'NOT_CONTAINS':
      return `"${filter.field}" NOT LIKE '%${filter.value}%'`;
    case 'IS NULL':
      return `"${filter.field}" IS NULL`;
    case 'IS NOT NULL':
      return `"${filter.field}" IS NOT NULL`;
  }
}

function convertFilterNullToSqlClause(
  filter: FilterNullItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'IS':
      return `"${filter.field}" IS NULL`;
    case 'IS_NOT':
      return `"${filter.field}" IS NOT NULL`;
  }
}

function convertFilterDateToSqlClause(
  filter: FilterDateItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'AFTER':
      return `${filter.field} > '${filter.value}'`;
    case 'BEFORE':
      return `${filter.field} < '${filter.value}'`;
    case 'BETWEEN':
      if (filter.value != null && typeof filter.value === 'object') {
        return `(${filter.field} >= '${filter.value.start}' AND ${filter.field} < '${filter.value.end}')`;
      }
  }
  return undefined;
}

function convertFilterStringListToSqlClause(
  filter: FilterStringListItem & Pick<FilterItem, 'field'>,
) {
  switch (filter.operation) {
    case 'IN':
      return `${filter.field} IN (${filter.value
        .map((value) => `'${value}'`)
        .join(', ')})`;
    case 'NOT_IN':
      return `${filter.field} NOT IN (${filter.value
        .map((value) => `'${value}'`)
        .join(', ')})`;
  }
}

function negateOperator(op: 'AND' | 'OR'): 'AND' | 'OR' {
  switch (op) {
    case 'AND':
      return 'OR';
    case 'OR':
      return 'AND';
  }
}
function negateOperation(op: FilterItem['operation']): FilterItem['operation'] {
  switch (op) {
    case 'AFTER':
      return 'BEFORE';
    case 'BEFORE':
      return 'AFTER';
    case 'BETWEEN':
      return 'BETWEEN';
    case 'CONTAINS':
      return 'NOT_CONTAINS';
    case 'EQUALS':
      return 'NOT_EQUALS';
    case 'GREATER_THAN':
      return 'LESS_THAN_OR_EQUAL';
    case 'GREATER_THAN_OR_EQUAL':
      return 'LESS_THAN';
    case 'IN':
      return 'NOT_IN';
    case 'LESS_THAN':
      return 'GREATER_THAN_OR_EQUAL';
    case 'LESS_THAN_OR_EQUAL':
      return 'GREATER_THAN';
    case 'NOT_CONTAINS':
      return 'CONTAINS';
    case 'NOT_EQUALS':
      return 'EQUALS';
    case 'NOT_IN':
      return 'IN';
    case 'IS':
      return 'IS_NOT';
    case 'IS_NOT':
      return 'IS';
    case 'IS NULL':
      return 'IS NOT NULL';
    case 'IS NOT NULL':
      return 'IS NULL';
  }
}

function convertFilterToSqlClause(filter: FilterItem) {
  switch (filter.type) {
    case 'DATE':
      return convertFilterDateToSqlClause(filter);
    case 'STRING':
      return convertFilterStringToSqlClause(filter);
    case 'STRING_LIST':
      return convertFilterStringListToSqlClause(filter);
    case 'NUMBER':
      return convertFilterNumberToSqlClause(filter);
    case 'NULL':
      return convertFilterNullToSqlClause(filter);
  }
}

interface FilterGroup {
  filters: FilterItem[];
  operator: 'AND' | 'OR';
}
function getStatusFilterString(value?: string): {
  groups: FilterGroup[];
  operator: 'AND' | 'OR';
} {
  switch (value) {
    case 'succeeded':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value: 'completed',
              },
              {
                type: 'STRING',
                field: 'completion_result',
                operation: 'EQUALS',
                value: 'success',
              },
            ],
            operator: 'AND',
          },
        ],
      };
    case 'failed':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value: 'completed',
              },
              {
                type: 'STRING',
                field: 'completion_result',
                operation: 'EQUALS',
                value: 'failure',
              },
              {
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'NOT_IN',
                value: [
                  '[409] killed',
                  '[409] Killed',
                  '[409] canceled',
                  '[409] Canceled',
                  '[409] cancelled',
                  '[409] Cancelled',
                  '[409] Error 409',
                  '[409] error 409',
                ],
              },
            ],
            operator: 'AND',
          },
        ],
      };
    case 'killed':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value: 'completed',
              },
              {
                type: 'STRING',
                field: 'completion_result',
                operation: 'EQUALS',
                value: 'failure',
              },
              {
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'IN',
                value: ['[409] killed', '[409] Killed', '[409 Aborted] killed'],
              },
            ],
            operator: 'AND',
          },
        ],
      };
    case 'cancelled':
      return {
        operator: 'AND',
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value: 'completed',
              },
              {
                type: 'STRING',
                field: 'completion_result',
                operation: 'EQUALS',
                value: 'failure',
              },
              {
                type: 'STRING_LIST',
                field: 'completion_failure',
                operation: 'IN',
                value: [
                  '[409] canceled',
                  '[409] Canceled',
                  '[409] Cancelled',
                  '[409] cancelled',
                ],
              },
            ],
            operator: 'AND',
          },
        ],
      };

    default:
      return {
        groups: [
          {
            filters: [
              {
                type: 'STRING',
                field: 'status',
                operation: 'EQUALS',
                value,
              },
            ],
            operator: 'AND',
          },
        ],
        operator: 'AND',
      };
  }
}

// The completed-derived UI statuses: not stored statuses, each is
// status = 'completed' refined by completion_result/completion_failure.
const COMPLETED_SUBSTATES = ['succeeded', 'failed', 'cancelled', 'killed'];

// Collapse the completed family to a single 'completed' when a filter carries
// the whole set (or an explicit 'completed'). 'completed' is one pushable
// raw-status predicate that matches every completed row exactly; the substates'
// completion_failure lists have gaps (e.g. '[409] Error 409' is excluded from
// 'failed' yet not matched by 'killed'/'cancelled'), so the expanded form both
// blocks scan pruning and keeps a few completed rows the umbrella drops. A
// partial set (e.g. just 'failed') is left untouched.
function normalizeCompletedStatuses(values: string[]): string[] {
  const set = new Set(values);
  const collapses =
    set.has('completed') || COMPLETED_SUBSTATES.every((value) => set.has(value));
  if (!collapses) {
    return values;
  }
  const rest = values.filter(
    (value) => value !== 'completed' && !COMPLETED_SUBSTATES.includes(value),
  );
  return [...rest, 'completed'];
}

// An invocation "belongs to" a deployment via either the deployment that last
// attempted it or the one it's pinned to. Both columns exist on the
// sys_invocation view; sys_invocation_status only has pinned_deployment_id
// (last_attempt_deployment_id lives in sys_invocation_state), so callers
// targeting that table pass a narrower field set.
const DEPLOYMENT_FILTER_FIELDS = [
  'last_attempt_deployment_id',
  'pinned_deployment_id',
] as const;

function deploymentPositiveFilter(
  value: string | undefined,
  fields: readonly string[],
) {
  return `(${fields
    .map((field) =>
      convertFilterStringToSqlClause({
        field,
        operation: 'EQUALS',
        type: 'STRING',
        value,
      }),
    )
    .join(' OR ')})`;
}

function deploymentNegativeFilter(
  value: string | undefined,
  fields: readonly string[],
) {
  return `(${fields
    .map(
      (field) =>
        `(${convertFilterStringToSqlClause({
          field,
          operation: 'NOT_EQUALS',
          type: 'STRING',
          value,
        })} OR ${convertFilterNullToSqlClause({
          field,
          operation: 'IS',
          type: 'NULL',
        })})`,
    )
    .join(' AND ')})`;
}

const VQUEUE_BACKING_OFF_SET =
  "SELECT entry_id FROM sys_vqueues WHERE stage = 'inbox' AND status = 'backing-off'";

// On the sys_invocation view a vqueue-backed backing-off invocation shows as
// 'ready'. Rewrite the 'backing-off'/'ready' status terms so the filter matches
// the overlaid status — and therefore the summary's buckets.
function vqueueStatusClause(value: string): string {
  return value === 'backing-off'
    ? `(status = 'backing-off' OR (status = 'ready' AND id IN (${VQUEUE_BACKING_OFF_SET})))`
    : `(status = 'ready' AND id NOT IN (${VQUEUE_BACKING_OFF_SET}))`;
}

function isVqueueRewrittenStatus(value?: string): boolean {
  return value === 'backing-off' || value === 'ready';
}

function invocationsFilterClauses(
  filters: FilterItem[],
  options: {
    deploymentFields?: readonly string[];
    vqueueBackingOff?: boolean;
  } = {},
): string[] {
  const deploymentFields = options.deploymentFields ?? DEPLOYMENT_FILTER_FIELDS;
  const vqueueBackingOff = options.vqueueBackingOff ?? false;
  const statusFilters = filters.filter((filter) => filter.field === 'status');
  const deploymentFilter = filters.find(
    (filter) => filter.field === 'deployment',
  );

  const mappedFilters = filters
    .filter(
      (filter) => filter.field !== 'status' && filter.field !== 'deployment',
    )
    .map(convertFilterToSqlClause)
    .filter((clause): clause is string => Boolean(clause));

  if (deploymentFilter) {
    if (deploymentFilter.type === 'STRING') {
      if (deploymentFilter.operation === 'EQUALS') {
        mappedFilters.push(
          deploymentPositiveFilter(deploymentFilter.value, deploymentFields),
        );
      }
      if (deploymentFilter.operation === 'NOT_EQUALS') {
        mappedFilters.push(
          deploymentNegativeFilter(deploymentFilter.value, deploymentFields),
        );
      }
    }
    if (deploymentFilter.type === 'STRING_LIST') {
      if (deploymentFilter.operation === 'IN') {
        mappedFilters.push(
          `(${deploymentFilter.value
            .map((value) => deploymentPositiveFilter(value, deploymentFields))
            .join(' OR ')})`,
        );
      }
      if (deploymentFilter.operation === 'NOT_IN') {
        mappedFilters.push(
          `(${deploymentFilter.value
            .map((value) => deploymentNegativeFilter(value, deploymentFields))
            .join(' AND ')})`,
        );
      }
    }
  }
  if (statusFilters.length > 0) {
    statusFilters.forEach((statusFilter) => {
      // Collapse the completed family to a single 'completed' (see
      // normalizeCompletedStatuses); only a STRING_LIST can carry the full set.
      const values =
        statusFilter.type === 'STRING_LIST'
          ? normalizeCompletedStatuses(statusFilter.value)
          : statusFilter.type === 'STRING' && statusFilter.value !== undefined
            ? [statusFilter.value]
            : [];
      // The backing-off/ready rewrite only changes the result when exactly one
      // of them is selected (it shifts vqueue-backed rows across that boundary).
      // When both are present the union equals the plain terms, so skip the
      // rewrite — and its sys_vqueues semi-joins — entirely.
      const statusValues = new Set<string | undefined>(values);
      const rewriteStatus = (value?: string) =>
        vqueueBackingOff &&
        isVqueueRewrittenStatus(value) &&
        !statusValues.has(value === 'backing-off' ? 'ready' : 'backing-off');

      if (statusFilter.type === 'STRING') {
        if (rewriteStatus(statusFilter.value)) {
          mappedFilters.push(vqueueStatusClause(statusFilter.value as string));
        } else {
          const { groups, operator } = getStatusFilterString(
            statusFilter.value,
          );
          mappedFilters.push(
            groups
              .map(
                ({ filters, operator }) =>
                  `(${filters
                    .map(convertFilterToSqlClause)
                    .filter(Boolean)
                    .join(` ${operator} `)})`,
              )
              .filter(Boolean)
              .join(` ${operator} `),
          );
        }
      } else if (
        statusFilter.type === 'STRING_LIST' &&
        statusFilter.operation === 'IN'
      ) {
        mappedFilters.push(
          `(${values
            .map((value) => {
              if (rewriteStatus(value)) {
                return vqueueStatusClause(value);
              }
              const { groups, operator } = getStatusFilterString(value);
              return groups
                .map(
                  ({ filters, operator }) =>
                    `(${filters
                      .map(convertFilterToSqlClause)
                      .filter(Boolean)
                      .join(` ${operator} `)})`,
                )
                .filter(Boolean)
                .map((clause) => `(${clause})`)
                .join(` ${operator} `);
            })
            .map((clause) => `(${clause})`)
            .join(' OR ')})`,
        );
      } else if (
        statusFilter.type === 'STRING_LIST' &&
        statusFilter.operation === 'NOT_IN'
      ) {
        mappedFilters.push(
          `(${values
            .map((value) => {
              if (rewriteStatus(value)) {
                return `NOT ${vqueueStatusClause(value)}`;
              }
              const { groups, operator } = getStatusFilterString(value);

              return groups
                .map(({ filters, operator }) =>
                  filters
                    .map(
                      (filter) =>
                        ({
                          ...filter,
                          operation: negateOperation(filter.operation),
                        }) as FilterItem,
                    )
                    .map(convertFilterToSqlClause)
                    .filter(Boolean)
                    .join(` ${negateOperator(operator)} `),
                )
                .filter(Boolean)
                .map((clause) => `(${clause})`)
                .join(` ${negateOperator(operator)} `);
            })
            .map((clause) => `(${clause})`)
            .join(' AND ')})`,
        );
      }
    });
  }

  return mappedFilters;
}

export function convertInvocationsFilters(
  filters: FilterItem[],
  options: {
    deploymentFields?: readonly string[];
    vqueueBackingOff?: boolean;
  } = {},
): string {
  const clauses = invocationsFilterClauses(filters, options);
  return clauses.length === 0 ? '' : `WHERE ${clauses.join(' AND ')}`;
}

// ---------------------------------------------------------------------------
// Base-join variant of the invocations filter.
//
// `sys_invocation` exposes a *computed* `status` column whose
// running/backing-off/ready branches read sys_invocation_state (the build side
// of the view's join). A filter on those values can't be pushed into the large
// sys_invocation_status scan, so the view falls back to a full scan + full CASE
// materialization. Querying the raw tables ourselves lets us front the filter
// with a pushable `ss.status = 'invoked'` predicate that prunes the scan first,
// with the in_flight/retry_count/vqueue tests running as a cheap post-join
// filter. `ss` = sys_invocation_status, `sis` = sys_invocation_state.
// ---------------------------------------------------------------------------

// The computed statuses whose view CASE branch depends on sys_invocation_state;
// the only ones the view can't push down, and all three are raw 'invoked'.
const INVOKED_DERIVED_STATUSES = new Set(['running', 'backing-off', 'ready']);

// Computed status -> the raw sys_invocation_status.status enum value it matches.
// Drives the pushable `ss.status IN (...)` prefilter.
const COMPUTED_TO_RAW_STATUS: Record<string, string> = {
  pending: 'inboxed',
  scheduled: 'scheduled',
  suspended: 'suspended',
  paused: 'paused',
  running: 'invoked',
  'backing-off': 'invoked',
  ready: 'invoked',
  completed: 'completed',
  succeeded: 'completed',
  failed: 'completed',
  killed: 'completed',
  cancelled: 'completed',
};

// Raw sys_invocation_status.status enum value -> the computed statuses that map
// to it. A NOT_IN filter can prune a raw status at the scan only when *every*
// computed status here is excluded (e.g. all of running/backing-off/ready to
// drop 'invoked'). 'completed' uses the umbrella value only; excluding just its
// substates (succeeded/failed/…) stays a post-join filter, never a wrong
// result.
const RAW_TO_COMPUTED: Record<string, readonly string[]> = {
  inboxed: ['pending'],
  scheduled: ['scheduled'],
  suspended: ['suspended'],
  paused: ['paused'],
  invoked: ['running', 'backing-off', 'ready'],
  completed: ['completed'],
};

const POSITIVE_STATUS_OPS = new Set(['IN', 'EQUALS']);
const NEGATIVE_STATUS_OPS = new Set(['NOT_IN', 'NOT_EQUALS']);

// Translate one computed-status value into a predicate over the raw join.
// `selectedValues` is the rest of the same filter's values: when both
// backing-off and ready are selected their union is the plain
// 'invoked AND not-running' set, so the vqueue semi-join can be skipped.
function baseJoinStatusClause(
  value: string,
  vqueueBackingOff: boolean,
  selectedValues: Set<string>,
): string {
  switch (value) {
    case 'pending':
      return "ss.status = 'inboxed'";
    case 'running':
      // in_flight is NULL when there's no state row (LEFT JOIN) -> not running.
      return "ss.status = 'invoked' AND sis.in_flight";
    case 'backing-off':
      return vqueueBackingOff && !selectedValues.has('ready')
        ? `ss.status = 'invoked' AND (sis.in_flight IS NOT TRUE) AND (sis.retry_count > 0 OR ss.id IN (${VQUEUE_BACKING_OFF_SET}))`
        : "ss.status = 'invoked' AND (sis.in_flight IS NOT TRUE) AND sis.retry_count > 0";
    case 'ready':
      return vqueueBackingOff && !selectedValues.has('backing-off')
        ? `ss.status = 'invoked' AND (sis.in_flight IS NOT TRUE) AND COALESCE(sis.retry_count, 0) = 0 AND ss.id NOT IN (${VQUEUE_BACKING_OFF_SET})`
        : "ss.status = 'invoked' AND (sis.in_flight IS NOT TRUE) AND COALESCE(sis.retry_count, 0) = 0";
    default: {
      // scheduled / suspended / paused / completed / succeeded / failed /
      // killed / cancelled already resolve to raw ss.status (+ completion_*)
      // predicates via the shared builder, keeping the kill/cancel error lists
      // defined in one place.
      const { groups, operator } = getStatusFilterString(value);
      return groups
        .map(
          ({ filters, operator }) =>
            `(${filters
              .map(convertFilterToSqlClause)
              .filter(Boolean)
              .join(` ${operator} `)})`,
        )
        .filter(Boolean)
        .join(` ${operator} `);
    }
  }
}

// Values of one status filter, normalized to a string[] (an unset STRING value
// contributes nothing).
function statusFilterValues(filter: FilterItem): string[] {
  if (filter.type === 'STRING_LIST') {
    return filter.value;
  }
  if (filter.type === 'STRING' && filter.value !== undefined) {
    return [filter.value];
  }
  return [];
}

// Whether the id query should be built over the raw base join instead of the
// sys_invocation view. True only when a status filter can't be pushed into the
// view's scan but can on the raw join:
//   - positive (IN/EQUALS) targeting an invoked-derived status, or
//   - negated (NOT_IN/NOT_EQUALS) excluding *all* invoked-derived statuses,
//     which yields a pushable `ss.status NOT IN ('invoked')` prefilter.
// Terminal-only filters (already pushed down on the view) and negated subsets
// of the invoked statuses (no pushable prefilter) keep using the view.
export function shouldUseBaseJoinForStatus(filters: FilterItem[]): boolean {
  const statusFilters = filters.filter((filter) => filter.field === 'status');
  if (statusFilters.length === 0) {
    return false;
  }
  // Only IN/EQUALS/NOT_IN/NOT_EQUALS are translated to the raw join.
  const allSupported = statusFilters.every(
    (filter) =>
      POSITIVE_STATUS_OPS.has(filter.operation) ||
      NEGATIVE_STATUS_OPS.has(filter.operation),
  );
  if (!allSupported) {
    return false;
  }
  return statusFilters.some((filter) => {
    const values = statusFilterValues(filter);
    if (POSITIVE_STATUS_OPS.has(filter.operation)) {
      return values.some((value) => INVOKED_DERIVED_STATUSES.has(value));
    }
    return [...INVOKED_DERIVED_STATUSES].every((status) =>
      values.includes(status),
    );
  });
}

// WHERE clause for the base join. Non-status filters are plain column
// predicates valid on either base table, so they reuse the shared builder;
// status filters are translated to the raw predicates above and fronted with
// pushable `ss.status IN (...)` / `NOT IN (...)` prefilters. Handles both
// positive (IN/EQUALS) and negated (NOT_IN/NOT_EQUALS) status filters.
export function convertInvocationsFiltersForBaseJoin(
  filters: FilterItem[],
  options: { vqueueBackingOff?: boolean } = {},
): string {
  const vqueueBackingOff = options.vqueueBackingOff ?? false;

  const clauses = invocationsFilterClauses(
    filters.filter((filter) => filter.field !== 'status'),
    { vqueueBackingOff },
  );

  const statusFilters = filters.filter((filter) => filter.field === 'status');
  const includeRaw = new Set<string>();
  // Only emit the IN prefilter when every value maps to a known raw status; an
  // unmapped value could otherwise be wrongly excluded by the IN list.
  let includeAllKnown = true;
  const excludeRaw = new Set<string>();
  const statusClauses: string[] = [];

  for (const statusFilter of statusFilters) {
    const values = normalizeCompletedStatuses(statusFilterValues(statusFilter));
    const selected = new Set<string>(values);

    if (NEGATIVE_STATUS_OPS.has(statusFilter.operation)) {
      // Negated: AND of the NULL-safe negations. `IS NOT TRUE` (not `NOT`) so
      // an invoked row with no state row — clause NULL — is kept, matching the
      // view, whose computed status column is never null.
      for (const [raw, computed] of Object.entries(RAW_TO_COMPUTED)) {
        if (computed.every((status) => selected.has(status))) {
          excludeRaw.add(raw);
        }
      }
      statusClauses.push(
        `(${values
          .map(
            (value) =>
              `((${baseJoinStatusClause(value, vqueueBackingOff, selected)}) IS NOT TRUE)`,
          )
          .join(' AND ')})`,
      );
    } else {
      // Positive: OR of the per-value clauses; collect the raw statuses they
      // touch for a pushable `ss.status IN (...)` prefilter.
      for (const value of values) {
        const raw = COMPUTED_TO_RAW_STATUS[value];
        if (raw) {
          includeRaw.add(raw);
        } else {
          includeAllKnown = false;
        }
      }
      statusClauses.push(
        `(${values
          .map(
            (value) =>
              `(${baseJoinStatusClause(value, vqueueBackingOff, selected)})`,
          )
          .join(' OR ')})`,
      );
    }
  }

  // Pushable prefilters first: the raw ss.status predicates the scan prunes on,
  // logically implied by statusClauses but invisible to the planner without it.
  if (excludeRaw.size > 0) {
    clauses.unshift(
      `ss.status NOT IN (${[...excludeRaw]
        .map((status) => `'${status}'`)
        .join(', ')})`,
    );
  }
  if (includeAllKnown && includeRaw.size > 0) {
    clauses.unshift(
      `ss.status IN (${[...includeRaw]
        .map((status) => `'${status}'`)
        .join(', ')})`,
    );
  }
  clauses.push(...statusClauses);

  return clauses.length === 0 ? '' : `WHERE ${clauses.join(' AND ')}`;
}

export function convertFilters(filters: FilterItem[]) {
  const mappedFilters = filters.map(convertFilterToSqlClause).filter(Boolean);

  if (mappedFilters.length === 0) {
    return '';
  } else {
    return `WHERE ${mappedFilters.join(' AND ')}`;
  }
}
