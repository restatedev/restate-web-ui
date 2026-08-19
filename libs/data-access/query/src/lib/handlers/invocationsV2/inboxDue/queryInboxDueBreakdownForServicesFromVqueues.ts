import type { QueryContext } from '../../shared';
import {
  sqlString,
  sqlStringList,
  VQUEUE_SERVICE_QUEUE_LIMIT,
} from '../shared';

type DueRow = {
  service_name?: string;
  total?: number | string;
  due?: number | string;
  not_due?: number | string;
};

/**
 * Returns first-runnable due state for selected services. Metadata queue IDs
 * are bounded before probing entries. The result is conservatively partial
 * because no second metadata scan is used to count the complete population.
 */
export async function queryInboxDueBreakdownForServicesFromVqueues(
  context: QueryContext,
  {
    serviceNames,
    asOf,
  }: {
    serviceNames: string[];
    asOf: string;
  },
) {
  const services = sqlStringList(serviceNames);
  const result = (await context.query(
    `
      SELECT
        COUNT(1) AS total,
        SUM(
          CASE
            WHEN v.first_runnable_at <= ${sqlString(asOf)} THEN 1
            ELSE 0
          END
        ) AS due,
        SUM(
          CASE
            WHEN v.first_runnable_at <= ${sqlString(asOf)} THEN 0
            ELSE 1
          END
        ) AS not_due
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
    `.trim(),
    'invocations-v2/inbox-due-for-services',
  )) as { rows: DueRow[] };

  return {
    rows: result.rows,
    partial: {
      reason: 'vqueue-limit' as const,
      queueLimit: VQUEUE_SERVICE_QUEUE_LIMIT,
    },
  };
}
