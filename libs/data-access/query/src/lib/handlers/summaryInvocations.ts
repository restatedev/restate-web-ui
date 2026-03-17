import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertInvocationsFilters } from '../convertFilters';
import { type QueryContext } from './shared';

const DEFAULT_SAMPLE_SIZE = 50000;
const HIGHLIGHT_FIELDS = new Set(['status', 'target_service_name']);
const FAILED_SUBSTATES = ['failed', 'cancelled', 'killed'];

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

export async function summaryInvocations(
  this: QueryContext,
  filters: FilterItem[],
  sampled = true,
  sampleSize = DEFAULT_SAMPLE_SIZE,
) {
  const baseFilters = filters.filter((f) => !HIGHLIGHT_FIELDS.has(f.field));
  const where = convertInvocationsFilters(baseFilters);
  const subquery = sampled
    ? `(SELECT * FROM sys_invocation LIMIT ${sampleSize})`
    : 'sys_invocation';

  const countsPromise = this.query(
    `SELECT status, completion_result, target_service_name, COUNT(1) as count FROM ${subquery} ${where} GROUP BY status, completion_result, target_service_name`,
  );

  const servicesPromise = this.query(`SELECT name FROM sys_service`);

  const [{ rows }, { rows: serviceRows }] = await Promise.all([
    countsPromise,
    servicesPromise,
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

  for (const row of serviceRows) {
    const name = row.name as string;
    if (!serviceCounts[name]) {
      serviceCounts[name] = { total: 0, included: 0 };
    }
  }

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
  });
}
