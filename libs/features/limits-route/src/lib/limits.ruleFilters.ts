import type { components } from '@restate/data-access/admin-api-spec';
import { LIMIT_RULE_PATTERN_FILTER_ID } from '@restate/features/vqueue-ui';
import {
  QueryClause,
  type QueryClauseOption,
  type QueryClauseSchema,
  type QueryClauseType,
} from '@restate/ui/filter-builder';

type LimitRuleWithStats = components['schemas']['LimitRuleWithStats'];

const LIMIT_RULE_PATTERN_FILTER_SCHEMA = {
  id: LIMIT_RULE_PATTERN_FILTER_ID,
  label: 'Pattern',
  operations: [{ value: 'EQUALS', label: 'is' }],
  type: 'STRING',
} satisfies QueryClauseSchema<'STRING'>;

export const LIMIT_RULE_FILTER_SCHEMA = [LIMIT_RULE_PATTERN_FILTER_SCHEMA];

export function limitRuleFilterSchema(
  rules: LimitRuleWithStats[],
): QueryClauseSchema<'STRING'> {
  return {
    ...LIMIT_RULE_PATTERN_FILTER_SCHEMA,
    options: rules.map(
      (rule): QueryClauseOption => ({
        value: rule.pattern,
        label: rule.pattern,
      }),
    ),
  };
}

export function selectedLimitRulePattern(
  clauses: QueryClause<QueryClauseType>[],
) {
  const clause = clauses.find(
    (candidate) => candidate.id === LIMIT_RULE_PATTERN_FILTER_ID,
  );
  return clause?.isValid &&
    clause.value.operation === 'EQUALS' &&
    typeof clause.value.value === 'string'
    ? clause.value.value
    : undefined;
}
