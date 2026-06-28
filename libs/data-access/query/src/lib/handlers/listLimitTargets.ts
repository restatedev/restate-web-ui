import type {
  components,
  FilterItem,
} from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import { filtersToClause } from '../convertFilters';

type LimitSort = components['schemas']['LimitSort'];

// Columns the targets table is allowed to sort by (guards the ORDER BY against
// arbitrary field names from the URL). `head_wait` is the derived alias below;
// the rest are real sys_vqueue_meta columns.
const TARGET_SORT_FIELDS = new Set([
  'head_wait',
  'num_inbox',
  'num_running',
  'num_suspended',
  'num_paused',
  'num_finished',
  'last_finish_at',
  'service_name',
]);

function buildTargetOrderBy(sort?: LimitSort): string {
  if (sort && TARGET_SORT_FIELDS.has(sort.field)) {
    const dir = sort.order === 'ASC' ? 'ASC' : 'DESC';
    return `ORDER BY ${sort.field} ${dir} NULLS LAST, head_wait DESC NULLS LAST`;
  }
  return 'ORDER BY head_wait DESC NULLS LAST, m.num_running DESC, m.num_inbox DESC';
}

// A target = one virtual queue (sys_vqueue_meta) for an object under a counter,
// joined to its scheduler head/blocked state (sys_scheduler) by vqueue id.
// `head_wait` is derived = sum of all 7 block durations ("how long the head has
// been stuck, for any reason") and drives the default "most stuck first" sort.
export type LimitTargetRow = components['schemas']['LimitTargetRow'];
export type ListLimitTargetsResponse =
  components['schemas']['ListLimitTargetsResponse'];

const TARGETS_LIMIT = 100;

// A counter governs a set of virtual queues. Which set depends on the rule's
// level (verified against sys_user_limits ↔ sys_vqueue_meta reconciliation:
// usage == Σ num_running, num_waiters == Σ num_inbox):
//   Scope  → every queue in the scope (no limit_key constraint)
//   Level1 → the l1 key itself, plus any deeper key nested under it (l1/…)
//   Level2 → the exact l1/l2 key
function buildTargetsWhere(
  scope: string | undefined,
  l1: string | undefined,
  l2: string | undefined,
): string {
  const scopeClause = scope
    ? `m.scope = ${quoteSqlString(scope)}`
    : 'm.scope IS NULL';
  if (l1 && l2) {
    return `${scopeClause} AND m.limit_key = ${quoteSqlString(`${l1}/${l2}`)}`;
  }
  if (l1) {
    return `${scopeClause} AND (m.limit_key = ${quoteSqlString(l1)} OR m.limit_key LIKE ${quoteSqlString(`${l1}/%`)})`;
  }
  return scopeClause;
}

const HEAD_WAIT_SUM = `( s.invoker_concurrency_block_duration
  + s.throttling_rules_block_duration
  + s.invoker_throttling_block_duration
  + s.invoker_memory_block_duration
  + s.concurrency_rules_block_duration
  + s.lock_block_duration
  + s.deployment_concurrency_block_duration )`;

// A queue's live load = running + inbox + suspended + paused (excludes finished).
const LOAD_SUM = `( COALESCE(m.num_running, 0) + COALESCE(m.num_inbox, 0)
  + COALESCE(m.num_suspended, 0) + COALESCE(m.num_paused, 0) )`;

export async function getLimitTargetsRows(
  context: QueryContext,
  {
    scope,
    l1,
    l2,
    filters = [],
    sort,
  }: {
    scope?: string;
    l1?: string;
    l2?: string;
    filters?: FilterItem[];
    sort?: LimitSort;
  },
): Promise<LimitTargetRow[]> {
  const where = [buildTargetsWhere(scope, l1, l2), filtersToClause(filters)]
    .filter(Boolean)
    .join(' AND ');
  const { rows } = await context.query(`SELECT
      m.id, m.service_name, m.lock_name, m.limit_key, m.is_active, m.queue_is_paused,
      m.num_running, m.num_inbox, m.num_suspended, m.num_paused, m.num_finished,
      m.last_finish_at, m.last_attempt_at, m.last_enqueued_at, m.created_at,
      m.avg_end_to_end_duration,
      s.head_entry_id, s.status, s.blocked_on,
      s.blocked_on_json ->> 'blocked_rule' AS blocked_rule,
      s.blocked_on_json ->> 'blocked_level' AS blocked_level,
      s.invoker_concurrency_block_duration, s.throttling_rules_block_duration,
      s.invoker_throttling_block_duration, s.invoker_memory_block_duration,
      s.concurrency_rules_block_duration, s.lock_block_duration,
      s.deployment_concurrency_block_duration,
      ${HEAD_WAIT_SUM} AS head_wait
    FROM sys_vqueue_meta m
    LEFT JOIN sys_scheduler s ON m.id = s.id
    WHERE ${where}
    ${buildTargetOrderBy(sort)}
    LIMIT ${TARGETS_LIMIT}`);

  return rows as LimitTargetRow[];
}

// Busiest queue's load across the WHOLE filtered set (no LIMIT), so the Load bar
// scales against the true max even when that queue isn't on the fetched page.
// Joins sys_scheduler too because filters may reference its columns (blocked_on,
// status).
async function getLimitTargetsMaxLoad(
  context: QueryContext,
  {
    scope,
    l1,
    l2,
    filters = [],
  }: { scope?: string; l1?: string; l2?: string; filters?: FilterItem[] },
): Promise<number> {
  const where = [buildTargetsWhere(scope, l1, l2), filtersToClause(filters)]
    .filter(Boolean)
    .join(' AND ');
  const { rows } = await context.query(`SELECT MAX(${LOAD_SUM}) AS max_load
    FROM sys_vqueue_meta m
    LEFT JOIN sys_scheduler s ON m.id = s.id
    WHERE ${where}`);
  return Number(rows[0]?.max_load ?? 0) || 0;
}

export async function listLimitTargets(
  this: QueryContext,
  {
    scope,
    l1,
    l2,
    filters = [],
    sort,
  }: {
    scope?: string;
    l1?: string;
    l2?: string;
    filters?: FilterItem[];
    sort?: LimitSort;
  },
) {
  const [targets, max_load] = await Promise.all([
    getLimitTargetsRows(this, { scope, l1, l2, filters, sort }),
    getLimitTargetsMaxLoad(this, { scope, l1, l2, filters }),
  ]);
  const response: ListLimitTargetsResponse = { targets, max_load };
  return Response.json(response);
}
