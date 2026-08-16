import { writeFilterClauses } from '@restate/ui/filter-builder';
import type { LimitCounterIdentity } from '@restate/features/vqueue-ui';
import { createVQueueFiltersForCounter } from './limits.vqueueFilters';

export {
  ALL_LIMIT_COUNTERS,
  ANY_RULE_LIMIT_COUNTERS,
  LIMIT_COUNTER_RULE_QUERY_PARAM,
  limitCounterRuleSelection,
  limitCountersForIdentityHref,
  limitCountersForRuleHref,
  limitCountersHref,
  parseLimitCounterRuleSelection,
  selectedLimitCounterRule,
  type LimitCounterIdentity,
  type LimitCounterRuleSelection,
} from '@restate/features/vqueue-ui';

export function vqueuesForLimitCounterHref(
  baseUrl: string,
  identity: LimitCounterIdentity,
) {
  const search = writeFilterClauses(
    new URLSearchParams(),
    createVQueueFiltersForCounter(identity),
  );
  return `${baseUrl}/flow-control/vqueues?${search}`;
}
