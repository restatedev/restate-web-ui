import type { LimitRuleWithStats } from '@restate/data-access/admin-api-hooks';
import { LimitRuleTarget, LimitValue } from '@restate/features/vqueue-ui';

export function LimitRuleFilterValue({ pattern }: { pattern: string }) {
  return (
    <LimitRuleTarget
      pattern={pattern}
      density="tight"
      className="min-w-0"
      showIcon={false}
      showTooltip={false}
    />
  );
}

export function LimitRuleFilterOption({ rule }: { rule: LimitRuleWithStats }) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <LimitRuleTarget pattern={rule.pattern} showTooltip={false} />
      <span className="shrink-0">
        <LimitValue value={rule.limits.concurrency} disabled={rule.disabled} />
      </span>
    </span>
  );
}
