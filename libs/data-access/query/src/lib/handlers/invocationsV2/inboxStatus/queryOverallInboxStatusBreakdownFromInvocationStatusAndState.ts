import type { QueryContext } from '../../shared';

type StatusCountsRow = {
  inboxed?: number | string;
  scheduled?: number | string;
  invoked?: number | string;
};

type StateCountsRow = {
  running?: number | string;
  backing_off?: number | string;
};

/**
 * Returns exact overall legacy inbox status counts using parallel status and
 * state scans. Ready is the raw invoked remainder after running and
 * backing-off rows are removed.
 */
export async function queryOverallInboxStatusBreakdownFromInvocationStatusAndState(
  context: QueryContext,
) {
  const [statuses, states] = await Promise.all([
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
        SELECT
          SUM(CASE WHEN in_flight THEN 1 ELSE 0 END) AS running,
          SUM(
            CASE
              WHEN in_flight IS NOT TRUE AND retry_count > 0 THEN 1
              ELSE 0
            END
          ) AS backing_off
        FROM sys_invocation_state
      `.trim(),
    ),
  ]);

  const statusCounts = statuses.rows[0] as StatusCountsRow | undefined;
  const stateCounts = states.rows[0] as StateCountsRow | undefined;
  const invoked = Number(statusCounts?.invoked ?? 0);
  const running = Math.min(invoked, Number(stateCounts?.running ?? 0));
  const backingOff = Math.min(
    invoked - running,
    Number(stateCounts?.backing_off ?? 0),
  );

  return {
    rows: [
      { status: 'pending', count: Number(statusCounts?.inboxed ?? 0) },
      { status: 'scheduled', count: Number(statusCounts?.scheduled ?? 0) },
      { status: 'backing-off', count: backingOff },
      { status: 'ready', count: invoked - running - backingOff },
    ],
  };
}
