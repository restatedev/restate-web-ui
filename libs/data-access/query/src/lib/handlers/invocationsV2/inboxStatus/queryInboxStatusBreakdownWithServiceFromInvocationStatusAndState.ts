import type { QueryContext } from '../../shared';
import { sqlStringList } from '../shared';

type StatusCountsRow = {
  service_name?: string;
  inboxed?: number | string;
  scheduled?: number | string;
  invoked?: number | string;
};

type StateCountsRow = {
  service_name?: string;
  running?: number | string;
  backing_off?: number | string;
};

/**
 * Returns exact legacy inbox status counts when service filtering or grouping
 * is requested. Only the smaller state population joins status to recover the
 * requested service identity; both physical queries execute in parallel.
 */
export async function queryInboxStatusBreakdownWithServiceFromInvocationStatusAndState(
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
  const stateServiceFilter = serviceNames.length
    ? `\n          AND ss.target_service_name IN (${sqlStringList(serviceNames)})`
    : '';
  const statusGroupBy = groupByService
    ? '\n        GROUP BY target_service_name'
    : '';
  const stateGroupBy = groupByService
    ? '\n        GROUP BY ss.target_service_name'
    : '';

  const [statuses, states] = await Promise.all([
    context.query(
      `
        SELECT
          ${groupByService ? 'target_service_name AS service_name,\n          ' : ''}SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
          SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
        FROM sys_invocation_status
        WHERE status IN ('inboxed', 'scheduled', 'invoked')${statusServiceFilter}${statusGroupBy}
      `.trim(),
      'invocations-v2/inbox-status-by-service',
    ),
    context.query(
      `
        SELECT
          ${groupByService ? 'ss.target_service_name AS service_name,\n          ' : ''}SUM(CASE WHEN sis.in_flight THEN 1 ELSE 0 END) AS running,
          SUM(
            CASE
              WHEN sis.in_flight IS NOT TRUE AND sis.retry_count > 0 THEN 1
              ELSE 0
            END
          ) AS backing_off
        FROM sys_invocation_state sis
        JOIN sys_invocation_status ss ON ss.id = sis.id
        WHERE ss.status = 'invoked'${stateServiceFilter}${stateGroupBy}
      `.trim(),
      'invocations-v2/inbox-state-by-service',
    ),
  ]);

  const stateByService = new Map(
    (states.rows as StateCountsRow[]).map((row) => [
      row.service_name ?? '',
      row,
    ]),
  );

  return {
    rows: (statuses.rows as StatusCountsRow[]).flatMap((row) => {
      const state = stateByService.get(row.service_name ?? '');
      const invoked = Number(row.invoked ?? 0);
      const running = Math.min(invoked, Number(state?.running ?? 0));
      const backingOff = Math.min(
        invoked - running,
        Number(state?.backing_off ?? 0),
      );
      const service = groupByService ? { service_name: row.service_name } : {};

      return [
        {
          ...service,
          status: 'pending',
          count: Number(row.inboxed ?? 0),
        },
        {
          ...service,
          status: 'scheduled',
          count: Number(row.scheduled ?? 0),
        },
        { ...service, status: 'backing-off', count: backingOff },
        {
          ...service,
          status: 'ready',
          count: invoked - running - backingOff,
        },
      ];
    }),
  };
}
