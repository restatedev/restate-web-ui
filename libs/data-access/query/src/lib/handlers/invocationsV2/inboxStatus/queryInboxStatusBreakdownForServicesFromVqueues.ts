import type { QueryContext } from '../../shared';
import { sqlStringList, VQUEUE_SERVICE_QUEUE_LIMIT } from '../shared';

type StatusRow = {
  service_name?: string;
  status?: string;
  count?: number | string;
};

/**
 * Returns VQueue-native inbox statuses for selected services. Metadata queue
 * IDs are bounded before probing entries. The result is conservatively partial
 * because no second metadata scan is used to count the complete population.
 */
export async function queryInboxStatusBreakdownForServicesFromVqueues(
  context: QueryContext,
  {
    serviceNames,
  }: {
    serviceNames: string[];
  },
) {
  const services = sqlStringList(serviceNames);
  const result = (await context.query(
    `
      SELECT
        v.status,
        COUNT(1) AS count
      FROM sys_vqueues v
      WHERE v.id IN (
        SELECT vm.id
        FROM sys_vqueue_meta vm
        WHERE vm.service_name IN (${services})
          AND vm.num_inbox > 0
        LIMIT ${VQUEUE_SERVICE_QUEUE_LIMIT}
      )
        AND v.stage = 'inbox'
        AND v.entry_kind = 'invocation'
      GROUP BY v.status
    `.trim(),
  )) as { rows: StatusRow[] };

  return {
    rows: result.rows,
    partial: {
      reason: 'vqueue-limit' as const,
      queueLimit: VQUEUE_SERVICE_QUEUE_LIMIT,
    },
  };
}
