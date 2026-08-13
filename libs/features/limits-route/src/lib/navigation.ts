import { writeFilterClauses } from '@restate/ui/filter-builder';
import { createVQueueFiltersForCounter } from './limits.vqueueFilters';

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
