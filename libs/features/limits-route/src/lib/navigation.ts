import { writeFilterClauses } from '@restate/ui/filter-builder';
import type { LimitCounterIdentity } from '@restate/features/vqueue-ui';
import type { VirtualObjectInstanceIdentity } from '@restate/features/virtual-object-instance';
import {
  createVQueueFiltersForCounter,
  createVQueueFiltersForVirtualObjectInstance,
} from './limits.vqueueFilters';

export {
  ALL_LIMIT_COUNTERS,
  ANY_RULE_LIMIT_COUNTERS,
  LIMIT_COUNTER_RULE_QUERY_PARAM,
  LIMIT_RULE_PATTERN_FILTER_ID,
  limitCounterRuleSelection,
  limitCountersForIdentityHref,
  limitCountersForRuleHref,
  limitCountersHref,
  limitRulesForPatternHref,
  parseLimitCounterRuleSelection,
  selectedLimitCounterRule,
  type LimitCounterIdentity,
  type LimitCounterRuleSelection,
} from '@restate/features/vqueue-ui';

export function vqueuesForLimitCounterHref(
  baseUrl: string,
  identity: LimitCounterIdentity,
) {
  return filteredVqueuesHref(baseUrl, createVQueueFiltersForCounter(identity));
}

export function vqueuesForVirtualObjectInstanceHref(
  baseUrl: string,
  identity: VirtualObjectInstanceIdentity,
) {
  return filteredVqueuesHref(
    baseUrl,
    createVQueueFiltersForVirtualObjectInstance(identity),
  );
}

function filteredVqueuesHref(
  baseUrl: string,
  filters: Parameters<typeof writeFilterClauses>[1],
) {
  const search = writeFilterClauses(new URLSearchParams(), filters);
  return `${baseUrl}/flow-control/vqueues?${search}`;
}
