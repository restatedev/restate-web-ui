import type { QueryContext } from '../../shared';
import { sqlStringList } from '../shared';

type StatusCountsRow = {
  service_name?: string;
  inboxed?: number | string;
  scheduled?: number | string;
  invoked?: number | string;
};

type RunningCountRow = {
  service_name?: string;
  running?: number | string;
};

/**
 * Returns exact legacy due/not-due counts when service filtering or grouping
 * is requested. Status and running-state counts execute in parallel; only the
 * smaller running-state population joins status to recover service identity.
 */
export async function queryInboxDueBreakdownWithServiceFromInvocationStatusAndState(
  context: QueryContext,
  {
    serviceNames,
    groupByService,
  }: {
    serviceNames: string[];
    groupByService: boolean;
  },
) {
  const statusServiceFilter = serviceNames.length
    ? `\n          AND target_service_name IN (${sqlStringList(serviceNames)})`
    : '';
  const runningServiceFilter = serviceNames.length
    ? `\n          AND ss.target_service_name IN (${sqlStringList(serviceNames)})`
    : '';
  const statusGroupBy = groupByService
    ? '\n        GROUP BY target_service_name'
    : '';
  const runningGroupBy = groupByService
    ? '\n        GROUP BY ss.target_service_name'
    : '';

  const [statuses, running] = await Promise.all([
    context.query(
      `
        SELECT
          ${groupByService ? 'target_service_name AS service_name,\n          ' : ''}SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
          SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
        FROM sys_invocation_status
        WHERE status IN ('inboxed', 'scheduled', 'invoked')${statusServiceFilter}${statusGroupBy}
      `.trim(),
      'invocations-v2/inbox-due-status-by-service',
    ),
    context.query(
      `
        SELECT
          ${groupByService ? 'ss.target_service_name AS service_name,\n          ' : ''}COUNT(1) AS running
        FROM sys_invocation_state sis
        JOIN sys_invocation_status ss ON ss.id = sis.id
        WHERE sis.in_flight
          AND ss.status = 'invoked'${runningServiceFilter}${runningGroupBy}
      `.trim(),
      'invocations-v2/inbox-due-running-by-service',
    ),
  ]);

  const runningByService = new Map(
    (running.rows as RunningCountRow[]).map((row) => [
      row.service_name ?? '',
      Number(row.running ?? 0),
    ]),
  );

  return {
    rows: (statuses.rows as StatusCountsRow[]).map((row) => {
      const inboxed = Number(row.inboxed ?? 0);
      const scheduled = Number(row.scheduled ?? 0);
      const invoked = Number(row.invoked ?? 0);
      const runningCount = Math.min(
        invoked,
        runningByService.get(row.service_name ?? '') ?? 0,
      );
      const due = inboxed + invoked - runningCount;

      return {
        ...(groupByService ? { service_name: row.service_name } : {}),
        total: due + scheduled,
        due,
        not_due: scheduled,
      };
    }),
  };
}
