import type { components } from '@restate/data-access-admin-api-spec';
import {
  badRequest,
  INVOCATION_STATUSES,
  resolveInvocationModeV2,
  type InvocationStatusV2,
} from './shared.js';
import { getInvocationStatusFromVqueue } from '../../invocationStatuses.js';
import type { QueryContext } from '../shared.js';
import { SERVICE_STATS, selectFromIndex } from '../indexes/index.js';
import { usesStatsTables } from '../../uiFeatures.js';
import { queryOverallInboxDueBreakdownFromVqueues } from './inboxDue/queryOverallInboxDueBreakdownFromVqueues.js';
import { queryInboxDueBreakdownForServicesFromVqueues } from './inboxDue/queryInboxDueBreakdownForServicesFromVqueues.js';
import { queryOverallInboxStatusBreakdownFromVqueues } from './inboxStatus/queryOverallInboxStatusBreakdownFromVqueues.js';
import { queryInboxStatusBreakdownForServicesFromVqueues } from './inboxStatus/queryInboxStatusBreakdownForServicesFromVqueues.js';

export type InboxInvocationsBreakdownV2Args =
  components['schemas']['InboxInvocationsBreakdownV2RequestBody'];

type DueBreakdownRow = {
  service_name?: string;
  total?: number | string;
  due?: number | string;
  not_due?: number | string;
};

type StatusBreakdownRow = {
  service_name?: string;
  status?: string;
  count?: number | string;
};

type InboxBreakdownPartialResult = {
  reason: 'vqueue-limit';
  queueLimit: number;
};

function buildDueBreakdownResponse(
  rows: DueBreakdownRow[],
  asOf: string,
  partial?: InboxBreakdownPartialResult,
) {
  let total = 0;
  let due = 0;
  let notDue = 0;
  for (const row of rows) {
    total += Number(row.total ?? 0);
    due += Number(row.due ?? 0);
    notDue += Number(row.not_due ?? 0);
  }

  return {
    groupBy: 'due' as const,
    asOf,
    total,
    due,
    notDue,
    isPartial: Boolean(partial),
    ...(partial && { partial }),
  };
}

function buildStatusBreakdownResponse(
  rows: StatusBreakdownRow[],
  partial?: InboxBreakdownPartialResult,
  sampledPopulationIsPartial = false,
) {
  const byStatus = new Map<InvocationStatusV2, number>();
  let total = 0;

  for (const row of rows) {
    // VQueue queries return raw values such as `new` and `started`; the
    // sys_invocation_status/state branches already return API status names.
    const status = row.status
      ? (getInvocationStatusFromVqueue({
          stage: 'inbox',
          status: row.status,
        }) ??
        (INVOCATION_STATUSES.includes(row.status as InvocationStatusV2)
          ? (row.status as InvocationStatusV2)
          : undefined))
      : undefined;
    if (!status) continue;
    const count = Number(row.count ?? 0);
    total += count;
    byStatus.set(status, (byStatus.get(status) ?? 0) + count);
  }

  return {
    groupBy: 'status' as const,
    total,
    byStatus: [...byStatus].map(([status, count]) => ({ status, count })),
    isPartial: Boolean(partial) || sampledPopulationIsPartial,
    ...(partial && { partial }),
  };
}

/**
 * Routes one inbox-breakdown API to distinct due or status query plans.
 */
export async function inboxInvocationsBreakdownV2(
  this: QueryContext,
  {
    groupBy,
    mode: requestedMode,
    serviceNames = [],
  }: InboxInvocationsBreakdownV2Args,
): Promise<Response> {
  const needsService = serviceNames.length > 0;

  if (groupBy === 'due') {
    const asOf = new Date().toISOString();
    let result: {
      rows: DueBreakdownRow[];
      partial?: InboxBreakdownPartialResult;
    };

    if (needsService) {
      result = await queryInboxDueBreakdownForServicesFromVqueues(this, {
        serviceNames,
        asOf,
      });
    } else {
      result = await queryOverallInboxDueBreakdownFromVqueues(this, asOf);
    }

    return Response.json(
      buildDueBreakdownResponse(result.rows, asOf, result.partial),
    );
  }

  const { mode, error } = resolveInvocationModeV2(requestedMode);
  if (error || !mode) return badRequest(error ?? 'Invalid mode');

  let result: {
    rows: StatusBreakdownRow[];
    partial?: InboxBreakdownPartialResult;
  };
  if (usesStatsTables(this)) {
    const rows = await selectFromIndex(this, SERVICE_STATS, {
      keys: { service_name: needsService ? serviceNames : undefined },
      id: 'stats/services',
    });
    result = {
      rows: rows
        .filter((row) => row.stage === 'inbox')
        .map((row) => ({ status: row.status, count: row.num_entries })),
    };
  } else if (needsService) {
    result = await queryInboxStatusBreakdownForServicesFromVqueues(this, {
      serviceNames,
    });
  } else {
    result = await queryOverallInboxStatusBreakdownFromVqueues(this, mode);
  }

  const sampledPopulationIsPartial =
    !usesStatsTables(this) &&
    !needsService &&
    mode.type === 'sampled' &&
    result.rows.reduce((total, row) => total + Number(row.count ?? 0), 0) >=
      mode.sampleSize;
  return Response.json(
    buildStatusBreakdownResponse(
      result.rows,
      result.partial,
      sampledPopulationIsPartial,
    ),
  );
}
