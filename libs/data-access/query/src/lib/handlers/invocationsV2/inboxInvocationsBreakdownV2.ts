import type { components } from '@restate/data-access/admin-api-spec';
import {
  badRequest,
  INVOCATION_STATUSES,
  resolveInvocationModeV2,
  supportsInvocationV2Vqueues,
  type InvocationStatusV2,
} from './shared';
import { getInvocationStatusFromVqueue } from '../../invocationStatuses';
import type { QueryContext } from '../shared';
import { queryInboxDueBreakdownWithServiceFromInvocationStatusAndState } from './inboxDue/queryInboxDueBreakdownWithServiceFromInvocationStatusAndState';
import { queryOverallInboxDueBreakdownFromInvocationStatusAndState } from './inboxDue/queryOverallInboxDueBreakdownFromInvocationStatusAndState';
import { queryOverallInboxDueBreakdownFromVqueues } from './inboxDue/queryOverallInboxDueBreakdownFromVqueues';
import { queryInboxDueBreakdownForServicesFromVqueues } from './inboxDue/queryInboxDueBreakdownForServicesFromVqueues';
import { queryInboxStatusBreakdownWithServiceFromInvocationStatusAndState } from './inboxStatus/queryInboxStatusBreakdownWithServiceFromInvocationStatusAndState';
import { queryOverallInboxStatusBreakdownFromInvocationStatusAndState } from './inboxStatus/queryOverallInboxStatusBreakdownFromInvocationStatusAndState';
import { queryOverallInboxStatusBreakdownFromVqueues } from './inboxStatus/queryOverallInboxStatusBreakdownFromVqueues';
import { queryInboxStatusBreakdownForServicesFromVqueues } from './inboxStatus/queryInboxStatusBreakdownForServicesFromVqueues';

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
  groupByService: boolean,
  partial?: InboxBreakdownPartialResult,
) {
  let total = 0;
  let due = 0;
  let notDue = 0;
  const byService = rows.map((row) => {
    const rowTotal = Number(row.total ?? 0);
    const rowDue = Number(row.due ?? 0);
    const rowNotDue = Number(row.not_due ?? 0);
    total += rowTotal;
    due += rowDue;
    notDue += rowNotDue;

    return {
      service: row.service_name ?? '',
      total: rowTotal,
      due: rowDue,
      notDue: rowNotDue,
    };
  });

  return {
    groupBy: 'due' as const,
    asOf,
    total,
    due,
    notDue,
    isPartial: Boolean(partial),
    ...(partial && { partial }),
    ...(groupByService ? { byService } : {}),
  };
}

function buildStatusBreakdownResponse(
  rows: StatusBreakdownRow[],
  groupByService: boolean,
  partial?: InboxBreakdownPartialResult,
  sampledPopulationIsPartial = false,
) {
  const byStatus = new Map<InvocationStatusV2, number>();
  const byService = new Map<string, number>();
  const byServiceAndStatus = new Map<
    string,
    { service: string; status: InvocationStatusV2; count: number }
  >();
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

    if (!groupByService || !row.service_name) continue;
    byService.set(
      row.service_name,
      (byService.get(row.service_name) ?? 0) + count,
    );
    const key = `${row.service_name}\0${status}`;
    const combined = byServiceAndStatus.get(key) ?? {
      service: row.service_name,
      status,
      count: 0,
    };
    combined.count += count;
    byServiceAndStatus.set(key, combined);
  }

  return {
    groupBy: 'status' as const,
    total,
    byStatus: [...byStatus].map(([status, count]) => ({ status, count })),
    isPartial: Boolean(partial) || sampledPopulationIsPartial,
    ...(partial && { partial }),
    ...(groupByService && {
      byService: [...byService].map(([service, count]) => ({ service, count })),
      byServiceAndStatus: [...byServiceAndStatus.values()],
    }),
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
    groupByService = false,
  }: InboxInvocationsBreakdownV2Args,
): Promise<Response> {
  const useVqueues = supportsInvocationV2Vqueues(this);
  const needsService = groupByService || serviceNames.length > 0;

  if (useVqueues && groupByService) {
    return badRequest(
      'groupByService is not supported when VQueues are enabled',
    );
  }

  if (groupBy === 'due') {
    const asOf = new Date().toISOString();
    let result: {
      rows: DueBreakdownRow[];
      partial?: InboxBreakdownPartialResult;
    };

    if (useVqueues && serviceNames.length) {
      result = await queryInboxDueBreakdownForServicesFromVqueues(this, {
        serviceNames,
        asOf,
      });
    } else if (useVqueues) {
      result = await queryOverallInboxDueBreakdownFromVqueues(this, asOf);
    } else if (needsService) {
      result =
        await queryInboxDueBreakdownWithServiceFromInvocationStatusAndState(
          this,
          { serviceNames, groupByService },
        );
    } else {
      result =
        await queryOverallInboxDueBreakdownFromInvocationStatusAndState(this);
    }

    return Response.json(
      buildDueBreakdownResponse(
        result.rows,
        asOf,
        groupByService,
        result.partial,
      ),
    );
  }

  const { mode, error } = resolveInvocationModeV2(requestedMode);
  if (error || !mode) return badRequest(error ?? 'Invalid mode');

  let result: {
    rows: StatusBreakdownRow[];
    partial?: InboxBreakdownPartialResult;
  };
  if (useVqueues && serviceNames.length) {
    result = await queryInboxStatusBreakdownForServicesFromVqueues(this, {
      serviceNames,
    });
  } else if (useVqueues) {
    result = await queryOverallInboxStatusBreakdownFromVqueues(this, mode);
  } else if (needsService) {
    result =
      await queryInboxStatusBreakdownWithServiceFromInvocationStatusAndState(
        this,
        { serviceNames, groupByService },
      );
  } else {
    result =
      await queryOverallInboxStatusBreakdownFromInvocationStatusAndState(this);
  }

  const sampledPopulationIsPartial =
    useVqueues &&
    !needsService &&
    mode.type === 'sampled' &&
    result.rows.reduce((total, row) => total + Number(row.count ?? 0), 0) >=
      mode.sampleSize;
  return Response.json(
    buildStatusBreakdownResponse(
      result.rows,
      groupByService,
      result.partial,
      sampledPopulationIsPartial,
    ),
  );
}
