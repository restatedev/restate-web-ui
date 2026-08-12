import { InlineTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

export type FlowControlRuleLevel = 'scope' | 'level1' | 'level2';

export const FLOW_CONTROL_RULE_LEVEL_META: Record<
  FlowControlRuleLevel,
  {
    label: string;
    shortLabel: string;
    pattern: string;
    summary: string;
    description: string;
  }
> = {
  scope: {
    label: 'Scope',
    shortLabel: 'Scope',
    pattern: 'scope',
    summary: 'One concurrency budget for matching invocations in each scope.',
    description:
      'Limits all invocations sharing one concrete scope. Invocations with deeper limit keys also consume this budget.',
  },
  level1: {
    label: 'Level 1',
    shortLabel: 'L1',
    pattern: 'scope/l1',
    summary:
      'One concurrency budget for each matching Level 1 value within its scope.',
    description:
      'Limits one first-level subgroup inside a scope. L2 invocations beneath it also consume this budget.',
  },
  level2: {
    label: 'Level 2',
    shortLabel: 'L2',
    pattern: 'scope/l1/l2',
    summary:
      'One concurrency budget for each matching Level 2 value within its Level 1 parent.',
    description:
      'Limits one second-level subgroup inside L1. It does not create either parent limit.',
  },
};

const RULE_LEVELS: FlowControlRuleLevel[] = ['scope', 'level1', 'level2'];

const rowStyles = tv({
  base: 'grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-b border-zinc-600/70 px-2.5 py-2 last:border-b-0',
  variants: {
    active: {
      true: 'bg-zinc-700/70',
      false: 'bg-transparent',
    },
  },
});

export function FlowControlRuleLevelExplainer({
  children,
  activeLevel,
  className,
}: PropsWithChildren<{
  activeLevel?: FlowControlRuleLevel;
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant="indicator-button"
      className={className}
      title="How rule levels work"
      ariaLabel="Explain flow-control rule levels"
      description={
        <div className="w-80">
          <p className="text-xs leading-4 text-zinc-400">
            Pattern depth chooses the limit counter this rule limits.
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-600/70">
            {RULE_LEVELS.map((level) => {
              const meta = FLOW_CONTROL_RULE_LEVEL_META[level];
              return (
                <div
                  key={level}
                  className={rowStyles({ active: level === activeLevel })}
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      {meta.shortLabel}
                    </div>
                    <code className="text-[0.5625rem] text-zinc-400">
                      {meta.pattern}
                    </code>
                  </div>
                  <p className="text-xs leading-4 text-zinc-300">
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-xs leading-4 text-zinc-300">
            A rule defines only its own level. An invocation must have capacity
            at every configured matching level it touches; at L2, that can mean
            Scope, L1, and L2 simultaneously.
          </p>
          <p className="mt-2 text-xs leading-4 text-zinc-400">
            At the same level, the most specific matching pattern wins.
          </p>
        </div>
      }
      learnMoreHref="https://docs.restate.dev/services/flow-control#configuring-concurrency-limits"
    >
      {children}
    </InlineTooltip>
  );
}
