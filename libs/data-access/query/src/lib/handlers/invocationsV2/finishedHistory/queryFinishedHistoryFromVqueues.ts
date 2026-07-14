import type { QueryContext } from '../../shared';
import { sqlString } from '../shared';

/**
 * Returns exact epoch-aligned time buckets for all four finished VQueue
 * outcomes within the requested completion window.
 */
export function queryFinishedHistoryFromVqueues(
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
            transitioned_at,
            TIMESTAMP '1970-01-01T00:00:00'
          )
        ) AS bucket,
        COUNT(1) FILTER (WHERE status = 'succeeded') AS succeeded,
        COUNT(1) FILTER (WHERE status = 'failed') AS failed,
        COUNT(1) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(1) FILTER (WHERE status = 'killed') AS killed
      FROM sys_vqueues
      WHERE stage = 'finished'
        AND entry_kind = 'invocation'
        AND transitioned_at >= ${sqlString(startTime)}
        AND transitioned_at < ${sqlString(endTime)}
      GROUP BY bucket
    `.trim(),
  );
}
