import type { FilterItem } from '@restate/data-access/admin-api-spec';
import semverGte from 'semver/functions/gte';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext, DURATION_CALC } from './shared';

const DEFAULT_SAMPLE_SIZE = 50000;
const HIGHLIGHT_FIELDS = new Set(['status', 'target_service_name']);
const FAILED_SUBSTATES = ['failed', 'cancelled', 'killed'];
const SPLIT_TABLE_MIN_VERSION = '1.7.0';
const SPLIT_TABLE_SHARED_FIELDS = new Set([
  'id',
  'partition_key',
  'target_service_name',
  'target_service_key',
  'target_handler_name',
  'target_service_ty',
]);

function expandStatus(status: string): string[] {
  return status === 'failed' ? FAILED_SUBSTATES : [status];
}

function computedStatus(status: string, completionResult?: string): string {
  if (status === 'completed') {
    if (completionResult === 'success') return 'succeeded';
    return 'failed';
  }
  return status;
}

type Predicate = (value: string) => boolean;

function buildPredicate(filters: FilterItem[]): Predicate | null {
  if (filters.length === 0) return null;

  const predicates: Predicate[] = [];
  for (const f of filters) {
    if (f.type === 'STRING' && f.operation === 'EQUALS') {
      predicates.push((v) => v === f.value);
    } else if (f.type === 'STRING' && f.operation === 'NOT_EQUALS') {
      predicates.push((v) => v !== f.value);
    } else if (f.type === 'STRING_LIST' && f.operation === 'IN') {
      const set = new Set(f.value);
      predicates.push((v) => set.has(v));
    } else if (f.type === 'STRING_LIST' && f.operation === 'NOT_IN') {
      const set = new Set(f.value);
      predicates.push((v) => !set.has(v));
    }
  }

  if (predicates.length === 0) return null;
  return (value) => predicates.every((p) => p(value));
}

function buildInclusionMatcher(filters: FilterItem[]): {
  matchStatus: Predicate | null;
  matchService: Predicate | null;
} {
  return {
    matchStatus: buildPredicate(filters.filter((f) => f.field === 'status')),
    matchService: buildPredicate(
      filters.filter((f) => f.field === 'target_service_name'),
    ),
  };
}

function accumulate(
  status: string,
  service: string,
  count: number,
  matchStatus: Predicate | null,
  matchService: Predicate | null,
  statusCounts: Record<string, { total: number; included: number }>,
  serviceCounts: Record<string, { total: number; included: number }>,
  serviceStatusCounts: Record<
    string,
    Record<string, { total: number; included: number }>
  >,
): number {
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

  return included ? count : 0;
}

function buildResponse(
  statusCounts: Record<string, { total: number; included: number }>,
  serviceCounts: Record<string, { total: number; included: number }>,
  serviceStatusCounts: Record<
    string,
    Record<string, { total: number; included: number }>
  >,
  totalCount: number,
  sampled: boolean,
  extra?: Record<string, unknown>,
) {
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
    ...extra,
  });
}

function supportsSplitTable(restateVersion: string): boolean {
  const released = restateVersion.split('-').at(0);
  return released ? semverGte(released, SPLIT_TABLE_MIN_VERSION) : false;
}

function filtersCompatibleWithSplitTable(filters: FilterItem[]): boolean {
  return filters.every(
    (f) =>
      HIGHLIGHT_FIELDS.has(f.field) ||
      SPLIT_TABLE_SHARED_FIELDS.has(f.field),
  );
}

export async function summaryInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sampled = true,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  includeDuration = false,
) {
  if (
    supportsSplitTable(this.restateVersion) &&
    filtersCompatibleWithSplitTable(filters)
  ) {
    return summaryInvocationsSplit.call(
      this,
      filters,
      sampled,
      sampleSize,
      includeDuration,
    );
  }
  return summaryInvocationsLegacy.call(
    this,
    filters,
    sampled,
    sampleSize,
    includeDuration,
  );
}

async function summaryInvocationsLegacy(
  this: QueryContext,
  filters: FilterItem[],
  sampled: boolean,
  sampleSize: number,
  includeDuration: boolean,
) {
  const baseFilters = filters.filter((f) => !HIGHLIGHT_FIELDS.has(f.field));
  const where = convertInvocationsFilters(baseFilters);
  const subquery = sampled
    ? `(SELECT * FROM sys_invocation LIMIT ${sampleSize})`
    : 'sys_invocation';

  const countsPromise = this.query(
    `SELECT status, completion_result, target_service_name, COUNT(1) as count FROM ${subquery} ${where} GROUP BY status, completion_result, target_service_name`,
  );

  const durationPromise = includeDuration
    ? this.query(
        `SELECT APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.5) as p50, APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.9) as p90, APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.99) as p99 FROM ${subquery} ${where}`,
      )
    : undefined;

  const [{ rows }, durationResult] = await Promise.all([
    countsPromise,
    durationPromise,
  ]);

  const { matchStatus, matchService } = buildInclusionMatcher(filters);

  const statusCounts: Record<string, { total: number; included: number }> = {};
  const serviceCounts: Record<string, { total: number; included: number }> = {};
  const serviceStatusCounts: Record<
    string,
    Record<string, { total: number; included: number }>
  > = {};
  let totalCount = 0;

  for (const row of rows) {
    const status = computedStatus(row.status, row.completion_result);
    const service = row.target_service_name as string;
    const count = Number(row.count);

    totalCount += accumulate(
      status,
      service,
      count,
      matchStatus,
      matchService,
      statusCounts,
      serviceCounts,
      serviceStatusCounts,
    );
  }

  let extra: Record<string, unknown> | undefined;
  if (durationResult) {
    const p = durationResult.rows?.at(0);
    if (p?.p50 != null && p?.p90 != null && p?.p99 != null) {
      extra = {
        duration: {
          p50: String(p.p50),
          p90: String(p.p90),
          p99: String(p.p99),
        },
      };
    }
  }

  return buildResponse(
    statusCounts,
    serviceCounts,
    serviceStatusCounts,
    totalCount,
    sampled,
    extra,
  );
}

async function summaryInvocationsSplit(
  this: QueryContext,
  filters: FilterItem[],
  sampled: boolean,
  sampleSize: number,
  includeDuration: boolean,
) {
  const baseFilters = filters.filter((f) => !HIGHLIGHT_FIELDS.has(f.field));
  const where = convertInvocationsFilters(baseFilters);

  const statusSource = sampled
    ? `(SELECT status, completion_result, target_service_name FROM sys_invocation_status ${where} LIMIT ${sampleSize})`
    : `sys_invocation_status`;
  const statusWhere = sampled ? '' : where;

  const countsPromise = this.query(
    `SELECT status, completion_result, target_service_name, COUNT(1) as count FROM ${statusSource} ${statusWhere} GROUP BY status, completion_result, target_service_name`,
  );

  const statePromise = this.query(
    `SELECT target_service_name, CASE WHEN in_flight THEN 'running' WHEN retry_count > 0 THEN 'backing-off' END as derived_status, COUNT(1) as count FROM sys_invocation_state GROUP BY target_service_name, derived_status`,
  );

  const servicesPromise = this.query(`SELECT name FROM sys_service`);

  const durationSubquery = sampled
    ? `(SELECT * FROM sys_invocation LIMIT ${sampleSize})`
    : 'sys_invocation';
  const durationPromise = includeDuration
    ? this.query(
        `SELECT APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.5) as p50, APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.9) as p90, APPROX_PERCENTILE_CONT(${DURATION_CALC}, 0.99) as p99 FROM ${durationSubquery} ${where}`,
      )
    : undefined;

  const [{ rows }, { rows: stateRows }, { rows: serviceRows }, durationResult] =
    await Promise.all([
      countsPromise,
      statePromise,
      servicesPromise,
      durationPromise,
    ]);

  const statePerService = new Map<
    string,
    { running: number; 'backing-off': number }
  >();
  for (const row of stateRows) {
    const service = row.target_service_name as string;
    const count = Number(row.count);
    const entry = statePerService.get(service) ?? {
      running: 0,
      'backing-off': 0,
    };
    if (row.derived_status === 'running') entry.running += count;
    else if (row.derived_status === 'backing-off')
      entry['backing-off'] += count;
    statePerService.set(service, entry);
  }

  const { matchStatus, matchService } = buildInclusionMatcher(filters);

  const statusCounts: Record<string, { total: number; included: number }> = {};
  const serviceCounts: Record<string, { total: number; included: number }> = {};
  const serviceStatusCounts: Record<
    string,
    Record<string, { total: number; included: number }>
  > = {};
  let totalCount = 0;

  for (const row of rows) {
    const rawStatus = row.status as string;
    const service = row.target_service_name as string;
    const count = Number(row.count);

    if (rawStatus === 'invoked') {
      const state = statePerService.get(service);
      const running = state?.running ?? 0;
      const backingOff = state?.['backing-off'] ?? 0;
      const ready = Math.max(0, count - running - backingOff);

      if (running > 0) {
        totalCount += accumulate(
          'running',
          service,
          running,
          matchStatus,
          matchService,
          statusCounts,
          serviceCounts,
          serviceStatusCounts,
        );
      }
      if (backingOff > 0) {
        totalCount += accumulate(
          'backing-off',
          service,
          backingOff,
          matchStatus,
          matchService,
          statusCounts,
          serviceCounts,
          serviceStatusCounts,
        );
      }
      if (ready > 0) {
        totalCount += accumulate(
          'ready',
          service,
          ready,
          matchStatus,
          matchService,
          statusCounts,
          serviceCounts,
          serviceStatusCounts,
        );
      }
    } else if (rawStatus === 'completed') {
      const status =
        row.completion_result === 'success' ? 'succeeded' : 'failed';
      totalCount += accumulate(
        status,
        service,
        count,
        matchStatus,
        matchService,
        statusCounts,
        serviceCounts,
        serviceStatusCounts,
      );
    } else if (rawStatus === 'inboxed') {
      totalCount += accumulate(
        'pending',
        service,
        count,
        matchStatus,
        matchService,
        statusCounts,
        serviceCounts,
        serviceStatusCounts,
      );
    } else {
      totalCount += accumulate(
        rawStatus,
        service,
        count,
        matchStatus,
        matchService,
        statusCounts,
        serviceCounts,
        serviceStatusCounts,
      );
    }
  }

  for (const row of serviceRows) {
    const name = row.name as string;
    if (!serviceCounts[name]) {
      serviceCounts[name] = { total: 0, included: 0 };
    }
  }

  let extra: Record<string, unknown> | undefined;
  if (durationResult) {
    const p = durationResult.rows?.at(0);
    if (p?.p50 != null && p?.p90 != null && p?.p99 != null) {
      extra = {
        duration: {
          p50: String(p.p50),
          p90: String(p.p90),
          p99: String(p.p99),
        },
      };
    }
  }

  return buildResponse(
    statusCounts,
    serviceCounts,
    serviceStatusCounts,
    totalCount,
    sampled,
    extra,
  );
}
