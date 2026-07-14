import type { QueryContext } from '../../shared';
import { sqlString } from '../shared';
import { buildOutcomes, countRows, type ResolvedFinishedMode } from './shared';

/** Returns an exact or bounded finished-outcome breakdown from VQueues. */
export async function queryFinishedBreakdownFromVqueues(
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
  const timeClauses = [
    startTime ? `transitioned_at >= ${sqlString(startTime)}` : undefined,
    endTime ? `transitioned_at < ${sqlString(endTime)}` : undefined,
  ].filter((clause): clause is string => clause !== undefined);
  let query: string;
  if (mode.type === 'sampled') {
    query = `
      SELECT
        sampled_finished.status,
        COUNT(1) AS count
      FROM (
        SELECT status
        FROM sys_vqueues
        WHERE stage = 'finished'
          AND entry_kind = 'invocation'${timeClauses
            .map((clause) => `\n          AND ${clause}`)
            .join('')}
        LIMIT ${mode.sampleSize}
      ) sampled_finished
      GROUP BY sampled_finished.status
    `.trim();
  } else {
    query = `
      SELECT
        status,
        COUNT(1) AS count
      FROM sys_vqueues
      WHERE stage = 'finished'
        AND entry_kind = 'invocation'${timeClauses
          .map((clause) => `\n        AND ${clause}`)
          .join('')}
      GROUP BY status
    `.trim();
  }

  const { rows } = await context.query(query);
  const scannedCount = countRows(rows);

  return Response.json({
    mode: mode.type,
    granularity: 'exact',
    isPartial: mode.type === 'sampled' && scannedCount >= mode.sampleSize,
    scannedCount,
    outcomes: buildOutcomes(rows),
  });
}
