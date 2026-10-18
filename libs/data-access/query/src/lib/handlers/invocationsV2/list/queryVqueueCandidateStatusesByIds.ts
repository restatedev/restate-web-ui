import type { QueryContext } from '../../shared.js';
import { sqlStringList } from '../shared.js';

export function queryVqueueCandidateStatusesByIds(
  context: QueryContext,
  ids: string[],
) {
  return context.query(
    `
      SELECT
        v.entry_id,
        v.stage,
        v.status
      FROM sys_vqueue_entry_status v
      WHERE v.entry_id IN (${sqlStringList(ids)})
    `.trim(),
    'invocations-v2/candidate-statuses-by-ids',
  ) as Promise<{
    rows: Array<{ entry_id: string; stage: string; status: string }>;
  }>;
}
