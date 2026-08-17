import type {
  components,
  VqueueEntryStage,
} from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import {
  getVirtualObjectEntryDetails,
  type VirtualObjectEntryRow,
} from './virtualObjectEntries';
import { getVqueueSnapshot } from './getVqueue';

const ENTRY_LIMIT = 25;
const ENTRY_QUERY_LIMIT = ENTRY_LIMIT + 1;

const VQUEUE_ENTRY_STAGES = [
  'inbox',
  'running',
  'suspended',
  'paused',
  'finished',
] as const satisfies readonly VqueueEntryStage[];

type VqueueEntriesResponse = components['schemas']['VqueueEntriesResponse'];

export function isVqueueEntryStage(
  value: string | null,
): value is VqueueEntryStage {
  return VQUEUE_ENTRY_STAGES.some((stage) => stage === value);
}

export async function getVqueueEntries(
  this: QueryContext,
  vqueueId: string,
  stage: VqueueEntryStage,
) {
  if (!this.features.has('vqueues')) {
    return new Response(null, { status: 204 });
  }

  const [snapshot, { rows }] = await Promise.all([
    getVqueueSnapshot.call(this, vqueueId),
    this.query(`SELECT
      id AS vqueue_id,
      entry_id AS id,
      entry_kind AS kind,
      stage,
      status,
      has_lock,
      sequence_number,
      created_at,
      transitioned_at,
      first_runnable_at,
      first_attempt_at,
      latest_attempt_at,
      num_attempts,
      num_errors,
      num_pauses,
      num_suspensions,
      num_yields,
      deployment
    FROM sys_vqueues
    WHERE id = ${quoteSqlString(vqueueId)}
      AND stage = ${quoteSqlString(stage)}
    LIMIT ${ENTRY_QUERY_LIMIT}`),
  ]);
  if (!snapshot) {
    return new Response(null, { status: 204 });
  }
  const foundEntries = rows as VirtualObjectEntryRow[];
  const entryDetails = await getVirtualObjectEntryDetails(
    this,
    foundEntries,
    'all',
    true,
  );
  const hydratedEntries = foundEntries.flatMap((row) => {
    const entry = row.id ? entryDetails.entriesById.get(row.id) : undefined;
    if (!entry || entry.stage !== stage) return [];
    const { runAt, ...entryWithoutRunAt } = entry;
    return [
      {
        ...entryWithoutRunAt,
        ...(runAt ? { nextAt: runAt } : {}),
      },
    ];
  });
  const response: VqueueEntriesResponse = {
    snapshot,
    stage,
    rows: hydratedEntries.slice(0, ENTRY_LIMIT),
    limit: ENTRY_LIMIT,
    truncated: foundEntries.length > ENTRY_LIMIT,
  };
  return Response.json(response);
}
