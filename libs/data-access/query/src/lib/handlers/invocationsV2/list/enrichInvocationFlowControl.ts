import type { components } from '@restate/data-access/admin-api-spec';
import { durationBetween } from '../../../convertInvocation';
import type { QueryContext } from '../../shared';
import {
  parseVqueueBlockedResource,
  parseVqueueSchedulingStatus,
} from '../../vqueueScheduler';
import { sqlStringList } from '../shared';

type InvocationV2 = components['schemas']['InvocationV2'];
type VqueueState = components['schemas']['InvocationVqueueStateV2'];
type FlowControl = components['schemas']['InvocationVqueueFlowControlV2'];

interface MetaRow {
  id?: unknown;
  queue_is_paused?: unknown;
  num_inbox?: unknown;
  num_running?: unknown;
  num_suspended?: unknown;
  num_paused?: unknown;
  avg_inbox_duration?: unknown;
  avg_run_duration?: unknown;
  avg_suspension_duration?: unknown;
}

interface SchedulerRow {
  id?: unknown;
  status?: unknown;
  blocked_on?: unknown;
  blocked_on_json?: unknown;
  head_entry_id?: unknown;
  scheduled_at?: unknown;
}

function metaQuery(vqueueIds: string[]) {
  return `SELECT
  id,
  queue_is_paused,
  num_inbox,
  num_running,
  num_suspended,
  num_paused,
  avg_inbox_duration,
  avg_run_duration,
  avg_suspension_duration
FROM sys_vqueue_meta
WHERE id IN (${sqlStringList(vqueueIds)})`;
}

function schedulerQuery(vqueueIds: string[]) {
  return `SELECT
  id,
  status,
  blocked_on,
  blocked_on_json,
  head_entry_id,
  scheduled_at
FROM sys_scheduler
WHERE id IN (${sqlStringList(vqueueIds)})`;
}

function stringValue(value: unknown): string | undefined {
  return value === null || value === undefined || value === ''
    ? undefined
    : String(value);
}

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function averageTimeInStage(
  vqueue: VqueueState,
  meta: MetaRow,
): string | undefined {
  const value = {
    inbox: meta.avg_inbox_duration,
    running: meta.avg_run_duration,
    suspended: meta.avg_suspension_duration,
    paused: undefined,
    finished: undefined,
  }[vqueue.stage];
  return stringValue(value);
}

function timeInStage(
  vqueue: VqueueState,
  requestTime: string,
): string | undefined {
  if (vqueue.stage === 'finished' || !vqueue.transitioned_at) return undefined;
  return durationBetween(vqueue.transitioned_at, requestTime);
}

function toFlowControl(
  vqueue: VqueueState,
  meta: MetaRow,
  scheduler: SchedulerRow | undefined,
  requestTime: string,
): FlowControl | undefined {
  const inboxCount = numberValue(meta.num_inbox);
  const runningCount = numberValue(meta.num_running);
  const suspendedCount = numberValue(meta.num_suspended);
  const pausedCount = numberValue(meta.num_paused);
  if (
    inboxCount === undefined ||
    runningCount === undefined ||
    suspendedCount === undefined ||
    pausedCount === undefined
  ) {
    return undefined;
  }

  const average = averageTimeInStage(vqueue, meta);
  const elapsed = timeInStage(vqueue, requestTime);
  const headEntryId = stringValue(scheduler?.head_entry_id);
  const scheduling = parseVqueueSchedulingStatus(
    stringValue(scheduler?.status),
  );
  const scheduledAt = stringValue(scheduler?.scheduled_at);
  const blockedOn = stringValue(scheduler?.blocked_on);
  const blockedResource = parseVqueueBlockedResource(
    scheduler?.blocked_on_json,
  );

  return {
    queuePaused: Boolean(meta.queue_is_paused),
    inboxCount,
    counts: {
      inbox: inboxCount,
      running: runningCount,
      suspended: suspendedCount,
      paused: pausedCount,
    },
    ...(elapsed && { timeInStage: elapsed }),
    ...(average && { averageTimeInStage: average }),
    ...(headEntryId && { headEntryId }),
    ...(scheduling && { scheduling }),
    ...(scheduledAt && { scheduledAt }),
    ...(blockedOn && { blockedOn }),
    ...(blockedResource && { blockedResource }),
  };
}

export async function enrichInvocationFlowControl(
  context: QueryContext,
  rows: InvocationV2[],
  requestTime: string,
): Promise<InvocationV2[]> {
  const vqueueIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.vqueue?.vqueue_id ? [row.vqueue.vqueue_id] : [],
      ),
    ),
  ];
  if (vqueueIds.length === 0) return rows;

  const [metaResult, schedulerResult] = await Promise.all([
    context.query(metaQuery(vqueueIds)),
    context.query(schedulerQuery(vqueueIds)),
  ]);
  const metaById = new Map(
    (metaResult.rows as MetaRow[]).flatMap((row) => {
      const id = stringValue(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const schedulerById = new Map(
    (schedulerResult.rows as SchedulerRow[]).flatMap((row) => {
      const id = stringValue(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );

  return rows.map((row) => {
    const vqueueId = row.vqueue?.vqueue_id;
    if (!vqueueId || !row.vqueue) return row;
    const meta = metaById.get(vqueueId);
    if (!meta) return row;
    const flowControl = toFlowControl(
      row.vqueue,
      meta,
      schedulerById.get(vqueueId),
      requestTime,
    );
    return flowControl
      ? { ...row, vqueue: { ...row.vqueue, flowControl } }
      : row;
  });
}
