import {
  FLOW_CONTROL_RULE_LEVEL_META,
  FlowControlRuleLevelExplainer,
} from '@restate/features/explainers';
import { Badge } from '@restate/ui/badge';
import { tv } from '@restate/util/styles';
import type { RuleLevel } from './pattern';

export const RULE_LEVEL_META = FLOW_CONTROL_RULE_LEVEL_META;

const explainerStyles = tv({ base: 'whitespace-nowrap' });

export function RuleLevelBadge({ level }: { level: RuleLevel }) {
  return (
    <Badge
      size="sm"
      className="shrink-0 border-blue-200 bg-blue-50 font-medium text-blue-700"
    >
      {RULE_LEVEL_META[level].label}
    </Badge>
  );
}

export function RuleLevelValue({ level }: { level: RuleLevel }) {
  const meta = RULE_LEVEL_META[level];
  return (
    <span
      title={meta.label}
      className="text-xs font-medium text-zinc-500 tabular-nums"
    >
      {meta.shortLabel}
    </span>
  );
}

export function RuleLevelExplainer({
  label = 'Level',
  activeLevel,
  className,
}: {
  label?: string;
  activeLevel?: RuleLevel;
  className?: string;
}) {
  return (
    <FlowControlRuleLevelExplainer
      activeLevel={activeLevel}
      className={explainerStyles({ className })}
    >
      {label}
    </FlowControlRuleLevelExplainer>
  );
}
