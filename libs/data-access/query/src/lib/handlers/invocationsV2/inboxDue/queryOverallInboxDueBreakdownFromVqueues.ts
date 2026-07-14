import type { QueryContext } from '../../shared';
import { sqlString } from '../shared';

/**
 * Returns the exact overall due/not-due inbox counts from the positive VQueue
 * inbox stage. This dominant request does not join or group by status.
 */
export function queryOverallInboxDueBreakdownFromVqueues(
  context: QueryContext,
  asOf: string,
) {
  return context.query(
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
      WHERE v.stage = 'inbox'
        AND v.entry_kind = 'invocation'
    `.trim(),
  );
}
