import type { components } from '@restate/data-access/admin-api-spec';

type Row = Record<string, unknown>;
type VqueueBlockedResource = components['schemas']['VqueueBlockedResource'];
type VqueueSchedulingStatus = components['schemas']['VqueueSchedulingStatus'];

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringValue(value: unknown): string | undefined {
  return value === null || value === undefined || value === ''
    ? undefined
    : String(value);
}

export function parseVqueueSchedulingStatus(
  value: string | undefined,
): VqueueSchedulingStatus | undefined {
  switch (value) {
    case 'dormant':
    case 'empty':
    case 'ready':
    case 'scheduled':
    case 'blocked':
      return value;
    default:
      return undefined;
  }
}

export function parseVqueueBlockedResource(
  value: unknown,
): VqueueBlockedResource | undefined {
  let resource: Row | undefined;
  if (typeof value === 'string') {
    if (value.trim() === '') return undefined;
    try {
      resource = JSON.parse(value) as Row;
    } catch {
      return undefined;
    }
  } else if (value && typeof value === 'object') {
    resource = value as Row;
  }
  if (!resource) return undefined;

  const rawResourceName = stringValue(resource['resource']);
  const resourceName = (() => {
    switch (rawResourceName) {
      case 'lock':
      case 'invoker-concurrency':
      case 'invoker-throttling':
      case 'invoker-memory':
      case 'deployment-concurrency':
      case 'limit-key-concurrency':
        return rawResourceName;
      default:
        return undefined;
    }
  })();
  if (resourceName === undefined) return undefined;

  const retryAt = numberValue(resource['estimated_retry_at']);
  const rawBlockedLevel = stringValue(resource['blocked_level']);
  const blockedLevel =
    rawBlockedLevel === 'scope' ||
    rawBlockedLevel === 'level1' ||
    rawBlockedLevel === 'level2'
      ? rawBlockedLevel
      : undefined;
  const scope = stringValue(resource['scope']);
  const lockName = stringValue(resource['lock_name']);
  const limitKey = stringValue(resource['limit_key']);
  const blockedRule = stringValue(resource['blocked_rule']);

  return {
    resource: resourceName,
    ...(scope && { scope }),
    ...(lockName && { lockName }),
    ...(retryAt !== undefined && {
      estimatedRetryAt: new Date(retryAt).toISOString(),
    }),
    ...(limitKey && { limitKey }),
    ...(blockedLevel && { blockedLevel }),
    ...(blockedRule && { blockedRule }),
  };
}
