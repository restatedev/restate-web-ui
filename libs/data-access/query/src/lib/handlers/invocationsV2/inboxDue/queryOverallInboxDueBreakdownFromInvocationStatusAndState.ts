import type { QueryContext } from '../../shared';

type StatusCountsRow = {
  inboxed?: number | string;
  scheduled?: number | string;
  invoked?: number | string;
};

/**
 * Returns exact overall legacy due/not-due counts using two parallel scans.
 * Status supplies the stored inbox population; the smaller state table supplies
 * the running count that must be removed from raw invoked rows.
 */
export async function queryOverallInboxDueBreakdownFromInvocationStatusAndState(
  context: QueryContext,
) {
  const [statuses, running] = await Promise.all([
    context.query(
      `
        SELECT
          SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
          SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
        FROM sys_invocation_status
        WHERE status IN ('inboxed', 'scheduled', 'invoked')
      `.trim(),
    ),
    context.query(
      `
        SELECT COUNT(1) AS running
        FROM sys_invocation_state
        WHERE in_flight
      `.trim(),
    ),
  ]);

  const statusCounts = statuses.rows[0] as StatusCountsRow | undefined;
  const inboxed = Number(statusCounts?.inboxed ?? 0);
  const scheduled = Number(statusCounts?.scheduled ?? 0);
  const invoked = Number(statusCounts?.invoked ?? 0);
  const runningCount = Math.min(invoked, Number(running.rows[0]?.running ?? 0));
  const due = inboxed + invoked - runningCount;

  return {
    rows: [{ total: due + scheduled, due, not_due: scheduled }],
  };
}
