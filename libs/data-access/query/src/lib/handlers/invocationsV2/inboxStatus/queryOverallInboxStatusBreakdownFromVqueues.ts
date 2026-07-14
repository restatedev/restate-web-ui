import type { QueryContext } from '../../shared';
import type { ResolvedInvocationModeV2 } from '../shared';

/**
 * Returns exact overall inbox counts grouped only by raw VQueue status. It does
 * not calculate first-runnable due state or join metadata.
 */
export function queryOverallInboxStatusBreakdownFromVqueues(
  context: QueryContext,
  mode: ResolvedInvocationModeV2,
) {
  if (mode.type === 'sampled') {
    return context.query(
      `
        SELECT
          sampled_inbox.status,
          COUNT(1) AS count
        FROM (
          SELECT
            v.status
          FROM sys_vqueues v
          WHERE v.stage = 'inbox'
            AND v.entry_kind = 'invocation'
          LIMIT ${mode.sampleSize}
        ) sampled_inbox
        GROUP BY sampled_inbox.status
      `.trim(),
    );
  }
  return context.query(
    `
      SELECT
        v.status,
        COUNT(1) AS count
      FROM sys_vqueues v
      WHERE v.stage = 'inbox'
        AND v.entry_kind = 'invocation'
      GROUP BY v.status
    `.trim(),
  );
}
