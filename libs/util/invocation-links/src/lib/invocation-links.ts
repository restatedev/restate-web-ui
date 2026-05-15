const FAILED_SUBSTATES = ['failed', 'cancelled', 'killed'];
const NON_IN_FLIGHT_STATUSES = ['succeeded', 'failed', 'cancelled', 'killed'];

function resolveStatuses(statusName: string, expandFailed = true): string[] {
  if (expandFailed && statusName === 'failed') return FAILED_SUBSTATES;
  return [statusName];
}

// /invocations owns filter_*, sort_*, column. Any of those arriving via
// existingParams have leaked from elsewhere — strip them. The single
// exception is filter_created_at, which is the documented way for callers
// to add a time-range filter via toCreatedAfterParam.
function buildParams(existingParams?: URLSearchParams) {
  const out = new URLSearchParams();
  if (!existingParams) return out;
  for (const [key, value] of existingParams) {
    if (key === 'filter_created_at') {
      out.append(key, value);
      continue;
    }
    if (
      key.startsWith('filter_') ||
      key.startsWith('sort_') ||
      key === 'column'
    ) {
      continue;
    }
    out.append(key, value);
  }
  return out;
}

export function toCreatedAfterParam(isoDate: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set(
    'filter_created_at',
    JSON.stringify({ operation: 'AFTER', value: isoDate }),
  );
  return params;
}

export function toInvocationsHref(
  baseUrl: string,
  statusName: string,
  {
    expandFailed = true,
    existingParams,
  }: { expandFailed?: boolean; existingParams?: URLSearchParams } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_status',
    JSON.stringify({
      operation: 'IN',
      value: resolveStatuses(statusName, expandFailed),
    }),
  );
  return `${baseUrl}/invocations?${params.toString()}`;
}

export function toServiceInvocationsHref(
  baseUrl: string,
  serviceName: string,
  { existingParams }: { existingParams?: URLSearchParams } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [serviceName] }),
  );
  return `${baseUrl}/invocations?${params.toString()}`;
}

export function toServiceAndHandlerInvocationsHref(
  baseUrl: string,
  serviceName: string,
  handlerName: string,
  { existingParams }: { existingParams?: URLSearchParams } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [serviceName] }),
  );
  params.set(
    'filter_target_handler_name',
    JSON.stringify({ operation: 'IN', value: [handlerName] }),
  );
  return `${baseUrl}/invocations?${params.toString()}`;
}

export function toDeploymentInvocationsHref(
  baseUrl: string,
  deploymentId: string,
  {
    existingParams,
    inFlightOnly = false,
  }: { existingParams?: URLSearchParams; inFlightOnly?: boolean } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_deployment',
    JSON.stringify({ operation: 'IN', value: [deploymentId] }),
  );
  if (inFlightOnly) {
    params.set(
      'filter_status',
      JSON.stringify({
        operation: 'NOT_IN',
        value: NON_IN_FLIGHT_STATUSES,
      }),
    );
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

export function toServiceStatusInvocationsHref(
  baseUrl: string,
  serviceName: string,
  statusName: string,
  {
    expandFailed = true,
    existingParams,
  }: { expandFailed?: boolean; existingParams?: URLSearchParams } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_target_service_name',
    JSON.stringify({ operation: 'IN', value: [serviceName] }),
  );
  params.set(
    'filter_status',
    JSON.stringify({
      operation: 'IN',
      value: resolveStatuses(statusName, expandFailed),
    }),
  );
  return `${baseUrl}/invocations?${params.toString()}`;
}
