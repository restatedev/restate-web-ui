/* eslint-disable no-constant-binary-expression */
import type { FilterItem } from '@restate/data-access/admin-api-spec';
import semverGte from 'semver/functions/gte';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext, DURATION_CALC } from './shared';

const DEFAULT_SAMPLE_SIZE = 50000;
// Filter fields applied client-side instead of in the SQL WHERE clause, so each
// facet keyed on one of these fields can report `total` (all rows, ignoring the
// filter) alongside `included` (rows matching the filter). This lets the UI show
// siblings of a selected value rather than collapsing them out of the response.
const HIGHLIGHT_FIELDS = new Set([
  'status',
  'target_service_name',
  'target_handler_name',
]);
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
type Counts = { total: number; included: number };
type Buckets = {
  status: Record<string, Counts>;
  service: Record<string, Counts>;
  serviceStatus: Record<string, Record<string, Counts>>;
  serviceHandler: Record<string, Record<string, Counts>>;
  serviceHandlerStatus: Record<string, Record<string, Record<string, Counts>>>;
};
type Matchers = {
  status: Predicate | null;
  service: Predicate | null;
  handler: Predicate | null;
};

function createBuckets(): Buckets {
  return {
    status: {},
    service: {},
    serviceStatus: {},
    serviceHandler: {},
    serviceHandlerStatus: {},
  };
}

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

function buildInclusionMatcher(filters: FilterItem[]): Matchers {
  return {
    status: buildPredicate(filters.filter((f) => f.field === 'status')),
    service: buildPredicate(
      filters.filter((f) => f.field === 'target_service_name'),
    ),
    handler: buildPredicate(
      filters.filter((f) => f.field === 'target_handler_name'),
    ),
  };
}

function accumulate(
  status: string,
  service: string,
  handler: string,
  count: number,
  matchers: Matchers,
  buckets: Buckets,
): number {
  const statusMatch =
    !matchers.status || expandStatus(status).some(matchers.status);
  const serviceMatch = !matchers.service || matchers.service(service);
  const handlerMatch = !matchers.handler || matchers.handler(handler);
  const included = statusMatch && serviceMatch && handlerMatch;

  if (!buckets.status[status])
    buckets.status[status] = { total: 0, included: 0 };
  buckets.status[status].total += count;
  if (statusMatch) buckets.status[status].included += count;

  if (!buckets.service[service])
    buckets.service[service] = { total: 0, included: 0 };
  buckets.service[service].total += count;
  if (serviceMatch) buckets.service[service].included += count;

  if (!buckets.serviceStatus[service]) buckets.serviceStatus[service] = {};
  if (!buckets.serviceStatus[service][status])
    buckets.serviceStatus[service][status] = { total: 0, included: 0 };
  buckets.serviceStatus[service][status].total += count;
  if (included) buckets.serviceStatus[service][status].included += count;

  if (!buckets.serviceHandler[service]) buckets.serviceHandler[service] = {};
  if (!buckets.serviceHandler[service][handler])
    buckets.serviceHandler[service][handler] = { total: 0, included: 0 };
  buckets.serviceHandler[service][handler].total += count;
  if (serviceMatch && handlerMatch)
    buckets.serviceHandler[service][handler].included += count;

  if (!buckets.serviceHandlerStatus[service])
    buckets.serviceHandlerStatus[service] = {};
  if (!buckets.serviceHandlerStatus[service][handler])
    buckets.serviceHandlerStatus[service][handler] = {};
  if (!buckets.serviceHandlerStatus[service][handler][status])
    buckets.serviceHandlerStatus[service][handler][status] = {
      total: 0,
      included: 0,
    };
  buckets.serviceHandlerStatus[service][handler][status].total += count;
  if (included)
    buckets.serviceHandlerStatus[service][handler][status].included += count;

  return included ? count : 0;
}

function buildResponse(
  buckets: Buckets,
  totalCount: number,
  sampled: boolean,
  extra?: Record<string, unknown>,
) {
  const byStatus = Object.entries(buckets.status).map(
    ([name, { total, included }]) => ({
      name,
      count: total,
      isIncluded: included > 0,
    }),
  );
  const byService = Object.entries(buckets.service)
    .map(([name, { total, included }]) => ({
      name,
      count: total,
      isIncluded: included > 0,
    }))
    .sort((a, b) => b.count - a.count);
  const byServiceAndStatus = Object.entries(buckets.serviceStatus).flatMap(
    ([service, statuses]) =>
      Object.entries(statuses).map(([status, { total, included }]) => ({
        service,
        status,
        count: total,
        isIncluded: included > 0,
      })),
  );
  const byServiceAndHandler = Object.entries(buckets.serviceHandler).flatMap(
    ([service, handlers]) =>
      Object.entries(handlers).map(([handler, { total, included }]) => ({
        service,
        handler,
        count: total,
        isIncluded: included > 0,
      })),
  );
  const byServiceAndHandlerAndStatus = Object.entries(
    buckets.serviceHandlerStatus,
  ).flatMap(([service, handlers]) =>
    Object.entries(handlers).flatMap(([handler, statuses]) =>
      Object.entries(statuses).map(([status, { total, included }]) => ({
        service,
        handler,
        status,
        count: total,
        isIncluded: included > 0,
      })),
    ),
  );

  return Response.json({
    totalCount,
    isEstimate: sampled,
    byStatus,
    byService,
    byServiceAndStatus,
    byServiceAndHandler,
    byServiceAndHandlerAndStatus,
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
      HIGHLIGHT_FIELDS.has(f.field) || SPLIT_TABLE_SHARED_FIELDS.has(f.field),
  );
}

export async function summaryInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sampled = true,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  includeDuration = false,
) {
  // TODO: re-enable split table path once compatible
  // if (
  //   // eslint-disable-next-line no-constant-condition
  //   false &&
  //   supportsSplitTable(this.restateVersion) &&
  //   filtersCompatibleWithSplitTable(filters)
  // ) {
  //   return summaryInvocationsSplit.call(
  //     this,
  //     filters,
  //     sampled,
  //     sampleSize,
  //     includeDuration,
  //   );
  // }
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
    `SELECT status, completion_result, target_service_name, target_handler_name, COUNT(1) as count FROM ${subquery} ${where} GROUP BY status, completion_result, target_service_name, target_handler_name`,
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

  const matchers = buildInclusionMatcher(filters);
  const buckets = createBuckets();
  let totalCount = 0;

  for (const row of rows) {
    const status = computedStatus(row.status, row.completion_result);
    const service = row.target_service_name as string;
    const handler = row.target_handler_name as string;
    const count = Number(row.count);

    totalCount += accumulate(
      status,
      service,
      handler,
      count,
      matchers,
      buckets,
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

  return buildResponse(buckets, totalCount, sampled, extra);
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
    ? `(SELECT status, completion_result, target_service_name, target_handler_name FROM sys_invocation_status ${where} LIMIT ${sampleSize})`
    : `sys_invocation_status`;
  const statusWhere = sampled ? '' : where;

  const countsPromise = this.query(
    `SELECT status, completion_result, target_service_name, target_handler_name, COUNT(1) as count FROM ${statusSource} ${statusWhere} GROUP BY status, completion_result, target_service_name, target_handler_name`,
  );

  const statePromise = this.query(
    `SELECT target_service_name, target_handler_name, CASE WHEN in_flight THEN 'running' WHEN retry_count > 0 THEN 'backing-off' END as derived_status, COUNT(1) as count FROM sys_invocation_state GROUP BY target_service_name, target_handler_name, derived_status`,
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

  const statePerServiceHandler = new Map<
    string,
    Map<string, { running: number; 'backing-off': number }>
  >();
  for (const row of stateRows) {
    const service = row.target_service_name as string;
    const handler = row.target_handler_name as string;
    const count = Number(row.count);
    const handlers =
      statePerServiceHandler.get(service) ??
      new Map<string, { running: number; 'backing-off': number }>();
    const entry = handlers.get(handler) ?? {
      running: 0,
      'backing-off': 0,
    };
    if (row.derived_status === 'running') entry.running += count;
    else if (row.derived_status === 'backing-off')
      entry['backing-off'] += count;
    handlers.set(handler, entry);
    statePerServiceHandler.set(service, handlers);
  }

  const matchers = buildInclusionMatcher(filters);
  const buckets = createBuckets();
  let totalCount = 0;

  for (const row of rows) {
    const rawStatus = row.status as string;
    const service = row.target_service_name as string;
    const handler = row.target_handler_name as string;
    const count = Number(row.count);

    if (rawStatus === 'invoked') {
      const state = statePerServiceHandler.get(service)?.get(handler);
      const running = state?.running ?? 0;
      const backingOff = state?.['backing-off'] ?? 0;
      const ready = Math.max(0, count - running - backingOff);

      if (running > 0) {
        totalCount += accumulate(
          'running',
          service,
          handler,
          running,
          matchers,
          buckets,
        );
      }
      if (backingOff > 0) {
        totalCount += accumulate(
          'backing-off',
          service,
          handler,
          backingOff,
          matchers,
          buckets,
        );
      }
      if (ready > 0) {
        totalCount += accumulate(
          'ready',
          service,
          handler,
          ready,
          matchers,
          buckets,
        );
      }
    } else if (rawStatus === 'completed') {
      const status =
        row.completion_result === 'success' ? 'succeeded' : 'failed';
      totalCount += accumulate(
        status,
        service,
        handler,
        count,
        matchers,
        buckets,
      );
    } else if (rawStatus === 'inboxed') {
      totalCount += accumulate(
        'pending',
        service,
        handler,
        count,
        matchers,
        buckets,
      );
    } else {
      totalCount += accumulate(
        rawStatus,
        service,
        handler,
        count,
        matchers,
        buckets,
      );
    }
  }

  for (const row of serviceRows) {
    const name = row.name as string;
    if (!buckets.service[name]) {
      buckets.service[name] = { total: 0, included: 0 };
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

  return buildResponse(buckets, totalCount, sampled, extra);
}
