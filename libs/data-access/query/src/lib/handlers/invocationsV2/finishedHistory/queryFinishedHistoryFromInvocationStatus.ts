import type { QueryContext } from '../../shared';
import { sqlString } from '../shared';

/**
 * Returns epoch-aligned completion buckets from `sys_invocation_status`. All
 * non-success outcomes are grouped as failed without reading
 * `completion_failure`.
 */
export function queryFinishedHistoryFromInvocationStatus(
  context: QueryContext,
  startTime: string,
  endTime: string,
  intervalSeconds: number,
) {
  return context.query(
    `
      SELECT
        to_unixtime(
          date_bin(
            INTERVAL '${intervalSeconds} seconds',
            completed_at,
            TIMESTAMP '1970-01-01T00:00:00'
          )
        ) AS bucket,
        COUNT(1) FILTER (WHERE completion_result = 'success') AS succeeded,
        COUNT(1) FILTER (WHERE completion_result = 'failure') AS failed
      FROM sys_invocation_status
      WHERE status = 'completed'
        AND completed_at >= ${sqlString(startTime)}
        AND completed_at < ${sqlString(endTime)}
      GROUP BY bucket
    `.trim(),
    'invocations-v2/finished-history-from-status',
  );
}
