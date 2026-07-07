import { type QueryContext, quoteSqlString } from './shared';

// Scheduling gates, in the order they're shown in the UI legend / breakdown.
// (Rendered as "Flow" in the UI, but everything here stays in vqueue terms.)
const GATES = [
  'concurrency_rules',
  'throttling_rules',
  'invoker_concurrency',
  'invoker_throttling',
  'invoker_memory',
  'lock',
  'deployment_concurrency',
] as const;

// The subset of gates sys_vqueue_meta keeps an EMA for (the "usually" ghost
// bar). The live scheduler breakdown carries all 7; the average only these 4.
const AVG_GATES = [
  'concurrency_rules',
  'invoker_concurrency',
  'invoker_throttling',
  'lock',
] as const;

// Table names per flow-spec.md / the Restate storage-query schema files.
const META_TABLE = 'sys_vqueue_meta';
const SCHEDULER_TABLE = 'sys_scheduler';
const ENTRY_TABLE = 'sys_vqueue_entry_status';

type Row = Record<string, unknown>;

// Each row is a `SELECT *` over a table that varies by server version, so every
// column is optional. The `[column: string]: unknown` index signature carries the
// dynamically-named gate columns gateDurations reads (avg_blocked_on_<gate>,
// <gate>_block_duration, …); the named columns stay dot-accessible and typed.
interface VqueueMetaRow {
  [column: string]: unknown;
  service_name?: string;
  scope?: string;
  lock_name?: string;
  limit_key?: string;
  queue_is_paused?: boolean;
  num_inbox?: number;
  num_running?: number;
  num_suspended?: number;
  num_paused?: number;
  num_finished?: number;
  avg_inbox_duration?: string;
  avg_run_duration?: string;
  avg_suspension_duration?: string;
  avg_queue_duration?: string;
  avg_end_to_end_duration?: string;
  last_enqueued_at?: string;
  last_start_at?: string;
  last_attempt_at?: string;
  last_finish_at?: string;
}

interface SchedulerRow {
  [column: string]: unknown;
  status?: string;
  blocked_on?: string;
  blocked_on_json?: unknown;
  head_entry_id?: string;
  scheduled_at?: string;
}

interface VqueueEntryRow {
  [column: string]: unknown;
  entry_id?: string;
  stage?: string;
  status?: string;
  entry_kind?: string;
  transitioned_at?: string;
  next_at?: string;
  created_at?: string;
  first_runnable_at?: string;
  first_attempt_at?: string;
  sequence_number?: number;
  retry_attempts?: number;
  num_attempts?: number;
  num_errors?: number;
  num_suspensions?: number;
  num_pauses?: number;
  num_yields?: number;
  deployment?: string;
  has_lock?: boolean;
}

interface PositionRow {
  [column: string]: unknown;
  ahead?: number;
  total?: number;
}

// Run a query, swallowing errors to `undefined`. A missing table or column
// (these vqueue tables vary by server version) then degrades just that section
// of the card rather than failing the whole request.
async function safeRows<T extends Row>(
  ctx: QueryContext,
  sql: string,
): Promise<T[] | undefined> {
  try {
    const { rows } = await ctx.query(sql);
    return rows as T[];
  } catch {
    return undefined;
  }
}

function numOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function strOrUndefined(value: unknown): string | undefined {
  return value === null || value === undefined || value === ''
    ? undefined
    : String(value);
}

// Build the {gate, duration}[] breakdown from one row, reading each gate's
// column by name (a dynamic key, hence the index access). Skips null / empty /
// zero so the UI only renders real waits.
function gateDurations(
  row: Row | undefined,
  columnFor: (gate: string) => string,
  gates: readonly string[],
): { gate: string; duration: string }[] {
  if (!row) {
    return [];
  }
  const out: { gate: string; duration: string }[] = [];
  for (const gate of gates) {
    const value = row[columnFor(gate)];
    if (value === null || value === undefined || value === '' || value === 0) {
      continue;
    }
    const duration = String(value);
    if (duration === '0' || duration === 'PT0S') {
      continue;
    }
    out.push({ gate, duration });
  }
  return out;
}

// Parse sys_scheduler.blocked_on_json (a serialised BlockedResource — all
// variants in worker-api/scheduler_status.rs) into the structured shape the UI
// renders. This is genuinely untyped external JSON, so each field is coerced /
// validated (unlike the typed table rows above). Accepts either a JSON string or
// an already-parsed object; unknown shapes degrade to just the `resource` tag.
// epoch-ms timestamps become ISO so the front-end treats them like every other
// date.
function parseBlockedResource(value: unknown):
  | {
      resource: string;
      scope?: string;
      lockName?: string;
      estimatedRetryAt?: string;
      limitKey?: string;
      blockedLevel?: string;
      blockedRule?: string;
    }
  | undefined {
  let obj: Row | undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    try {
      obj = JSON.parse(trimmed) as Row;
    } catch {
      return undefined;
    }
  } else if (value && typeof value === 'object') {
    obj = value as Row;
  }
  if (!obj) {
    return undefined;
  }
  const resource = strOrUndefined(obj['resource']);
  if (!resource) {
    return undefined;
  }

  const out: {
    resource: string;
    scope?: string;
    lockName?: string;
    estimatedRetryAt?: string;
    limitKey?: string;
    blockedLevel?: string;
    blockedRule?: string;
  } = { resource };

  const scope = strOrUndefined(obj['scope']);
  if (scope) {
    out.scope = scope;
  }
  const lockName = strOrUndefined(obj['lock_name']);
  if (lockName) {
    out.lockName = lockName;
  }
  const limitKey = strOrUndefined(obj['limit_key']);
  if (limitKey) {
    out.limitKey = limitKey;
  }
  const blockedLevel = strOrUndefined(obj['blocked_level']);
  if (blockedLevel) {
    out.blockedLevel = blockedLevel;
  }
  const blockedRule = strOrUndefined(obj['blocked_rule']);
  if (blockedRule) {
    out.blockedRule = blockedRule;
  }
  const retryMs = numOrUndefined(obj['estimated_retry_at']);
  if (retryMs !== undefined) {
    out.estimatedRetryAt = new Date(retryMs).toISOString();
  }
  return out;
}

// Shape the UI's EntryStatus needs from a sys_vqueue_entry_status row: the
// lifecycle (stage + status) plus the counters/timestamps the status pill
// annotates itself with.
function buildEntryStatus(row: VqueueEntryRow) {
  return {
    stage: row.stage,
    status: row.status,
    kind: row.entry_kind,
    transitionedAt: row.transitioned_at,
    nextAt: row.next_at,
    createdAt: row.created_at,
    sequenceNumber: row.sequence_number,
    retryAttempts: row.retry_attempts,
    numAttempts: row.num_attempts,
    numErrors: row.num_errors,
    numSuspensions: row.num_suspensions,
    numPauses: row.num_pauses,
    numYields: row.num_yields,
    deployment: row.deployment,
    hasLock: row.has_lock,
    totalBlocks: gateDurations(
      row,
      (gate) => `total_blocked_on_${gate}`,
      GATES,
    ),
  };
}

export async function getVqueue(
  this: QueryContext,
  vqueueId: string,
  invocationId?: string,
) {
  const unsupported = () => Response.json({ supported: false });

  if (!this.features.has('vqueues') || !vqueueId) {
    return unsupported();
  }

  // One wave — every read fires together (none feeds another). meta / scheduler /
  // head are keyed by the vqueue id and always run; entry / position run only with
  // an invocation in context. The two formerly-dependent reads are now
  // self-contained: `position` inlines the entry's sequence_number as a
  // (non-correlated) subquery and returns the live inbox total in the same shot
  // (ahead + total from one snapshot); `head` JOINs sys_scheduler so the head
  // verdict and the head's row come from one read. meta no longer gates — we fire
  // everything, then discard if the vqueue doesn't exist (a rare wasted batch).
  const [metaRows, schedulerRows, headRows, entryRows, positionRows] =
    await Promise.all([
      safeRows<VqueueMetaRow>(
        this,
        `SELECT * FROM ${META_TABLE} WHERE id = ${quoteSqlString(vqueueId)}`,
      ),
      safeRows<SchedulerRow>(
        this,
        `SELECT * FROM ${SCHEDULER_TABLE} WHERE id = ${quoteSqlString(vqueueId)}`,
      ),
      safeRows<VqueueEntryRow>(
        this,
        `SELECT e.* FROM ${ENTRY_TABLE} e JOIN ${SCHEDULER_TABLE} s ON e.entry_id = s.head_entry_id WHERE s.id = ${quoteSqlString(
          vqueueId,
        )}`,
      ),
      invocationId
        ? safeRows<VqueueEntryRow>(
            this,
            `SELECT * FROM ${ENTRY_TABLE} WHERE entry_id = ${quoteSqlString(
              invocationId,
            )}`,
          )
        : Promise.resolve(undefined),
      invocationId
        ? safeRows<PositionRow>(
            this,
            `SELECT SUM(CASE WHEN sequence_number < (SELECT sequence_number FROM ${ENTRY_TABLE} WHERE entry_id = ${quoteSqlString(
              invocationId,
            )}) THEN 1 ELSE 0 END) AS ahead, COUNT(*) AS total FROM ${ENTRY_TABLE} WHERE vqueue_id = ${quoteSqlString(
              vqueueId,
            )} AND stage = 'inbox'`,
          )
        : Promise.resolve(undefined),
    ]);

  const meta = metaRows?.at(0);
  if (!meta) {
    return unsupported();
  }
  const scheduler = schedulerRows?.at(0);
  const entryRow = entryRows?.at(0);
  const headRow = headRows?.at(0);
  const positionRow = positionRows?.at(0);

  // Queue identity comes from the meta row: service_name, scope, and lock_name
  // (which encodes the object key for keyed services as "<service>/<key>").
  const service = meta.service_name;
  const scope = meta.scope;
  const lockName = meta.lock_name;
  const objectKey =
    service && lockName && lockName.startsWith(`${service}/`)
      ? lockName.slice(service.length + 1)
      : undefined;

  // The vqueue's own limit key, straight from the meta row — the queue's identity
  // (the chip), e.g. scope "mike" / key "r/1". A DIFFERENT thing from the counter
  // that's currently biting (from blocked_on_json), which can sit at a shallower
  // level and say nothing about r/1.
  // TODO: biting-limit detail — the counter actually holding the head (usage /
  // cap / available / waiters), read from sys_user_limits (+ sys_rules) keyed off
  // blocked_on_json (scope + blocked_level + blocked_rule). Deferred for now; the
  // UI renders a placeholder. status.blockedResource already carries the rule /
  // key / level such a lookup would need.
  const limitKey = meta.limit_key;

  // Head verdict (scheduling + the blocked reason).
  const scheduling = scheduler?.status;
  const blockedOn = scheduler?.blocked_on;
  const blockedResource = parseBlockedResource(scheduler?.blocked_on_json);
  const blocked =
    Boolean(blockedOn) || scheduling === 'blocked' || Boolean(blockedResource);

  // The head id comes from the JOINed head row, so it's always consistent with the
  // status we render for it. If the head's row is mid-dispatch (gone), there's no
  // head box — better than an id with no detail.
  const headEntryId = headRow?.entry_id;

  // Entry position: 1-based rank among the queue's INBOX entries. The inbox is the
  // only ordered line, so we set it only when THIS entry is in the inbox (a
  // running / suspended / paused entry has no meaningful rank — the UI highlights
  // a representative tick). ahead + total come from one snapshot; total falls back
  // to the meta count.
  const inboxTotal = positionRow?.total ?? meta.num_inbox;
  const position =
    entryRow?.stage === 'inbox' ? (positionRow?.ahead ?? 0) + 1 : undefined;

  return Response.json({
    supported: true,
    identity: {
      service,
      objectKey,
      scope,
      limitKey,
      isPaused: Boolean(meta.queue_is_paused),
      vqueueId,
    },
    status: {
      blocked,
      blockedOn,
      // The scheduler's own verdict for the head (SchedulingStatus name):
      // dormant | empty | ready | scheduled | blocked. Absent when there's no
      // scheduler row (the UI then derives empty/dormant from the counts).
      scheduling,
      // When the head becomes visible/runnable — only meaningful for 'scheduled'.
      scheduledAt: scheduler?.scheduled_at,
      // The parsed reason behind a 'blocked' head (which resource, which rule).
      ...(blockedResource && { blockedResource }),
    },
    counts: {
      inbox: meta.num_inbox ?? 0,
      running: meta.num_running ?? 0,
      suspended: meta.num_suspended ?? 0,
      paused: meta.num_paused ?? 0,
      finished: meta.num_finished ?? 0,
    },
    stageAvg: {
      inbox: meta.avg_inbox_duration,
      running: meta.avg_run_duration,
      suspended: meta.avg_suspension_duration,
      // Avg time an entry spends queued before dispatch — distinct from the
      // end-to-end total.
      queue: meta.avg_queue_duration,
      endToEnd: meta.avg_end_to_end_duration,
    },
    events: {
      enqueuedAt: meta.last_enqueued_at,
      startAt: meta.last_start_at,
      attemptAt: meta.last_attempt_at,
      finishAt: meta.last_finish_at,
    },
    head: {
      entryId: headEntryId,
      // The head entry's own lifecycle (stage + status) and annotations.
      ...(headRow && buildEntryStatus(headRow)),
      nowBlocks: gateDurations(
        scheduler,
        (gate) => `${gate}_block_duration`,
        GATES,
      ),
      avgBlocks: gateDurations(
        meta,
        (gate) => `avg_blocked_on_${gate}`,
        AVG_GATES,
      ),
    },
    ...(entryRow && {
      entry: {
        id: entryRow.entry_id ?? invocationId,
        status: entryRow.status,
        stage: entryRow.stage,
        position,
        total: inboxTotal,
        attempts: entryRow.num_attempts,
        suspensions: entryRow.num_suspensions,
        pauses: entryRow.num_pauses,
        yields: entryRow.num_yields,
        errors: entryRow.num_errors,
        createdAt: entryRow.created_at,
        firstRunnableAt: entryRow.first_runnable_at,
        firstAttemptAt: entryRow.first_attempt_at,
        transitionedAt: entryRow.transitioned_at,
        nextAt: entryRow.next_at,
        totalBlocks: gateDurations(
          entryRow,
          (gate) => `total_blocked_on_${gate}`,
          GATES,
        ),
        latestBlocks: gateDurations(
          entryRow,
          (gate) => `latest_attempt_blocked_on_${gate}`,
          GATES,
        ),
      },
    }),
  });
}
