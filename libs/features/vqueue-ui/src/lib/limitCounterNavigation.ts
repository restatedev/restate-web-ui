import type { components } from '@restate/data-access/admin-api-spec';

type VqueueBlockedResource = components['schemas']['VqueueBlockedResource'];

export interface LimitCounterIdentity {
  scope: string;
  l1?: string;
  l2?: string;
}

export const LIMIT_COUNTER_RULE_QUERY_PARAM = 'rule';
export const ALL_LIMIT_COUNTERS = 'all';
export const ANY_RULE_LIMIT_COUNTERS = 'any';
const RULE_LIMIT_COUNTERS_PREFIX = 'rule:';

export type LimitCounterRuleSelection =
  | typeof ALL_LIMIT_COUNTERS
  | typeof ANY_RULE_LIMIT_COUNTERS
  | `rule:${string}`;

export function limitCounterRuleSelection(
  pattern: string,
): LimitCounterRuleSelection {
  return `${RULE_LIMIT_COUNTERS_PREFIX}${pattern}`;
}

export function parseLimitCounterRuleSelection(
  value: string | null,
): LimitCounterRuleSelection {
  if (value === ALL_LIMIT_COUNTERS) return ALL_LIMIT_COUNTERS;
  if (value === ANY_RULE_LIMIT_COUNTERS) return ANY_RULE_LIMIT_COUNTERS;
  if (
    value?.startsWith(RULE_LIMIT_COUNTERS_PREFIX) &&
    value.length > RULE_LIMIT_COUNTERS_PREFIX.length
  ) {
    return value as LimitCounterRuleSelection;
  }
  return ANY_RULE_LIMIT_COUNTERS;
}

export function selectedLimitCounterRule(selection: LimitCounterRuleSelection) {
  return selection.startsWith(RULE_LIMIT_COUNTERS_PREFIX)
    ? selection.slice(RULE_LIMIT_COUNTERS_PREFIX.length)
    : undefined;
}

export function limitCountersHref(
  baseUrl: string,
  selection: LimitCounterRuleSelection = ANY_RULE_LIMIT_COUNTERS,
) {
  const search = new URLSearchParams({
    [LIMIT_COUNTER_RULE_QUERY_PARAM]: selection,
  });
  return `${baseUrl}/flow-control/counters?${search}`;
}

export function limitCountersForRuleHref(baseUrl: string, pattern: string) {
  return limitCountersHref(baseUrl, limitCounterRuleSelection(pattern));
}

function setExactFilter(search: URLSearchParams, field: string, value: string) {
  search.set(`filter_${field}`, JSON.stringify({ operation: 'EQUALS', value }));
}

export function limitCountersForIdentityHref(
  baseUrl: string,
  identity: LimitCounterIdentity,
  pattern?: string,
) {
  const search = new URLSearchParams({
    [LIMIT_COUNTER_RULE_QUERY_PARAM]: pattern
      ? limitCounterRuleSelection(pattern)
      : ALL_LIMIT_COUNTERS,
  });
  setExactFilter(search, 'scope', identity.scope);
  if (identity.l1 && identity.l2) {
    setExactFilter(search, 'limitKey', `${identity.l1}/${identity.l2}`);
  } else if (identity.l2) {
    setExactFilter(search, 'l2', identity.l2);
  } else if (identity.l1) {
    setExactFilter(search, 'l1', identity.l1);
  }
  return `${baseUrl}/flow-control/counters?${search}`;
}

export function blockedLimitCounterIdentity(
  resource: VqueueBlockedResource,
): LimitCounterIdentity | undefined {
  if (
    resource.resource !== 'limit-key-concurrency' ||
    !resource.scope ||
    !resource.blockedLevel
  ) {
    return undefined;
  }
  const [l1, l2] = resource.limitKey?.split('/') ?? [];
  switch (resource.blockedLevel) {
    case 'scope':
      return { scope: resource.scope };
    case 'level1':
      return l1 ? { scope: resource.scope, l1 } : undefined;
    case 'level2':
      return l1 && l2 ? { scope: resource.scope, l1, l2 } : undefined;
  }
}
