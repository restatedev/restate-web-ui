export const DEFAULT_INVOCATION_COLUMNS = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'target',
  'status',
];

const FAILED_SUBSTATES = ['failed', 'cancelled', 'killed'];

function resolveStatuses(statusName: string, expandFailed = true): string[] {
  if (expandFailed && statusName === 'failed') return FAILED_SUBSTATES;
  return [statusName];
}

function buildParams(existingParams?: URLSearchParams) {
  const params = new URLSearchParams(existingParams);
  if (!params.has('sort_field')) params.set('sort_field', 'modified_at');
  if (!params.has('sort_order')) params.set('sort_order', 'DESC');
  if (!params.has('column')) {
    for (const col of DEFAULT_INVOCATION_COLUMNS) {
      params.append('column', col);
    }
  }
  return params;
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

export function toDeploymentInvocationsHref(
  baseUrl: string,
  deploymentId: string,
  { existingParams }: { existingParams?: URLSearchParams } = {},
) {
  const params = buildParams(existingParams);
  params.set(
    'filter_deployment',
    JSON.stringify({ operation: 'IN', value: [deploymentId] }),
  );
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
