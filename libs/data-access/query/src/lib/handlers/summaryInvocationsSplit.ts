import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';
import {
  expandStatus,
  buildInclusionMatcher,
} from './summaryInvocations';

const DEFAULT_SAMPLE_SIZE = 50000;
const HIGHLIGHT_FIELDS = new Set(['status', 'target_service_name']);

const INVOKED_SUBSTATES = ['running', 'backing-off', 'ready'] as const;

function distributeProportionally(
  total: number,
  ratios: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  let remaining = total;
  const entries = Object.entries(ratios);

  for (let i = 0; i < entries.length; i++) {
    const [key, ratio] = entries[i]!;
    if (i === entries.length - 1) {
      result[key] = remaining;
    } else {
      const share = Math.round(total * ratio);
      result[key] = share;
      remaining -= share;
    }
  }

  return result;
}

export async function summaryInvocationsSplit(
  this: QueryContext,
  filters: FilterItem[],
  sampled = true,
  sampleSize = DEFAULT_SAMPLE_SIZE,
) {
  const baseFilters = filters.filter((f) => !HIGHLIGHT_FIELDS.has(f.field));
  const where = convertInvocationsFilters(baseFilters);

  const statusSource = sampled
    ? `(SELECT status, completion_result, target_service_name FROM sys_invocation_status ${where} LIMIT ${sampleSize})`
    : `sys_invocation_status`;
  const statusWhere = sampled ? '' : where;

  const queryStart = performance.now();

  const countsPromise = this.query(
    `SELECT status, completion_result, target_service_name, COUNT(1) as count FROM ${statusSource} ${statusWhere} GROUP BY status, completion_result, target_service_name`,
  );

  const statePromise = this.query(
    `SELECT CASE WHEN in_flight THEN 'running' WHEN retry_count > 0 THEN 'backing-off' ELSE 'ready' END as derived_status, COUNT(1) as count FROM sys_invocation_state GROUP BY derived_status`,
  );

  const servicesPromise = this.query(`SELECT name FROM sys_service`);

  const [{ rows }, { rows: stateRows }, { rows: serviceRows }] =
    await Promise.all([countsPromise, statePromise, servicesPromise]);

  const queryMs = performance.now() - queryStart;
  const joinStart = performance.now();

  let invokedTotal = 0;
  const invokedRatios: Record<string, number> = {};
  for (const row of stateRows) {
    const count = Number(row.count);
    invokedRatios[row.derived_status as string] = count;
    invokedTotal += count;
  }
  if (invokedTotal > 0) {
    for (const key of Object.keys(invokedRatios)) {
      invokedRatios[key] = invokedRatios[key]! / invokedTotal;
    }
  } else {
    invokedRatios['ready'] = 1;
  }

  const { matchStatus, matchService } = buildInclusionMatcher(filters);

  const statusCounts: Record<string, { total: number; included: number }> = {};
  const serviceCounts: Record<string, { total: number; included: number }> = {};
  const serviceStatusCounts: Record<
    string,
    Record<string, { total: number; included: number }>
  > = {};
  let totalCount = 0;

  function accumulate(
    status: string,
    service: string,
    count: number,
  ) {
    const statusMatch = !matchStatus || expandStatus(status).some(matchStatus);
    const serviceMatch = !matchService || matchService(service);
    const included = statusMatch && serviceMatch;

    if (!statusCounts[status]) statusCounts[status] = { total: 0, included: 0 };
    statusCounts[status].total += count;
    if (statusMatch) statusCounts[status].included += count;

    if (!serviceCounts[service])
      serviceCounts[service] = { total: 0, included: 0 };
    serviceCounts[service].total += count;
    if (serviceMatch) serviceCounts[service].included += count;

    if (!serviceStatusCounts[service]) serviceStatusCounts[service] = {};
    if (!serviceStatusCounts[service][status])
      serviceStatusCounts[service][status] = { total: 0, included: 0 };
    serviceStatusCounts[service][status].total += count;
    if (included) serviceStatusCounts[service][status].included += count;

    if (included) totalCount += count;
  }

  for (const row of rows) {
    const rawStatus = row.status as string;
    const service = row.target_service_name as string;
    const count = Number(row.count);

    if (rawStatus === 'invoked') {
      const distributed = distributeProportionally(count, invokedRatios);
      for (const [subStatus, subCount] of Object.entries(distributed)) {
        if (subCount > 0) {
          accumulate(subStatus, service, subCount);
        }
      }
    } else if (rawStatus === 'completed') {
      const status =
        row.completion_result === 'success' ? 'succeeded' : 'failed';
      accumulate(status, service, count);
    } else if (rawStatus === 'inboxed') {
      accumulate('pending', service, count);
    } else {
      accumulate(rawStatus, service, count);
    }
  }

  for (const row of serviceRows) {
    const name = row.name as string;
    if (!serviceCounts[name]) {
      serviceCounts[name] = { total: 0, included: 0 };
    }
  }

  const joinMs = performance.now() - joinStart;

  const byStatus = Object.entries(statusCounts).map(
    ([name, { total, included }]) => ({
      name,
      count: total,
      isIncluded: included > 0,
    }),
  );
  const byService = Object.entries(serviceCounts)
    .map(([name, { total, included }]) => ({
      name,
      count: total,
      isIncluded: included > 0,
    }))
    .sort((a, b) => b.count - a.count);
  const byServiceAndStatus = Object.entries(serviceStatusCounts).flatMap(
    ([service, statuses]) =>
      Object.entries(statuses).map(([status, { total, included }]) => ({
        service,
        status,
        count: total,
        isIncluded: included > 0,
      })),
  );

  return Response.json({
    totalCount,
    isEstimate: sampled,
    byStatus,
    byService,
    byServiceAndStatus,
    timing: { queryMs: Math.round(queryMs), joinMs: Math.round(joinMs) },
  });
}
