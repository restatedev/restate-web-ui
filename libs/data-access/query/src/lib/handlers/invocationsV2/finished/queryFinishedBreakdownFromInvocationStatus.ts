import type { QueryContext } from '../../shared';
import { sqlString } from '../shared';
import { buildOutcomes, countRows, type ResolvedFinishedMode } from './shared';

/**
 * Returns an exact or bounded failure-grouped completion breakdown from
 * invocation status without reading the potentially large failure payload.
 */
export async function queryFinishedBreakdownFromInvocationStatus(
  context: QueryContext,
  {
    mode,
    startTime,
    endTime,
  }: {
    mode: ResolvedFinishedMode;
    startTime?: string;
    endTime?: string;
  },
): Promise<Response> {
  let query: string;
  if (mode.type === 'sampled') {
    query = `
      SELECT
        CASE
          WHEN completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END AS status,
        COUNT(1) AS count
      FROM (
        SELECT
          completion_result
        FROM sys_invocation_status
        WHERE status = 'completed'
          ${startTime ? `AND completed_at >= ${sqlString(startTime)}` : ''}
          ${endTime ? `AND completed_at < ${sqlString(endTime)}` : ''}
        LIMIT ${mode.sampleSize}
      ) completed_invocations
      GROUP BY
        CASE
          WHEN completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END
    `.trim();
  } else {
    query = `
      SELECT
        CASE
          WHEN completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END AS status,
        COUNT(1) AS count
      FROM sys_invocation_status
      WHERE status = 'completed'
        ${startTime ? `AND completed_at >= ${sqlString(startTime)}` : ''}
        ${endTime ? `AND completed_at < ${sqlString(endTime)}` : ''}
      GROUP BY
        CASE
          WHEN completion_result = 'success' THEN 'succeeded'
          ELSE 'failed'
        END
    `.trim();
  }

  const { rows } = await context.query(query);
  const scannedCount = countRows(rows);

  return Response.json({
    mode: mode.type,
    granularity: 'failure-grouped',
    isPartial: mode.type === 'sampled' && scannedCount >= mode.sampleSize,
    scannedCount,
    outcomes: buildOutcomes(rows),
  });
}
