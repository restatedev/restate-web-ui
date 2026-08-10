import {
  ChipGroup,
  type ChipGroupDensity,
  type ChipGroupVariant,
} from '@restate/ui/chip';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { LimitKey } from './LimitKey';
import { Scope } from './Scope';

export type LimitRuleLevel = 'scope' | 'level1' | 'level2';
export type LimitRuleTargetVariant = ChipGroupVariant | 'table';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 align-middle',
    identity: 'min-w-0 gap-x-0.5',
  },
  variants: {
    variant: {
      default: {},
      header: {},
      table: {
        root: 'w-full',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface LimitRuleTargetProps {
  pattern: string;
  className?: string;
  variant?: LimitRuleTargetVariant;
  density?: ChipGroupDensity;
}

export function getLimitRuleLevel(pattern: string): LimitRuleLevel {
  const components = pattern.split('/');
  if (components.length >= 3) return 'level2';
  if (components.length === 2) return 'level1';
  return 'scope';
}

export function LimitRuleTarget({
  pattern,
  className,
  variant = 'default',
  density,
}: LimitRuleTargetProps) {
  const [scope = '', level1, level2] = pattern.split('/');
  if (!scope) return null;

  const limitKey = [level1, level2].filter(Boolean).join('/');
  const level = getLimitRuleLevel(pattern);
  const resolvedDensity =
    density ?? (variant === 'header' ? 'default' : 'compact');
  const chipVariant = variant === 'header' ? 'header' : 'default';
  const { root, identity } = styles({ variant });

  return (
    <TruncateWithTooltip
      tooltipContent={pattern}
      copyText={pattern}
      hideCopy={variant !== 'table'}
      overflowVisible
    >
      <span
        className={root({ className })}
        data-limit-rule={pattern}
        data-limit-rule-level={level}
      >
        <ChipGroup
          variant={chipVariant}
          density={resolvedDensity}
          aria-label={`Limit rule ${pattern}`}
          className={identity()}
        >
          <Scope value={scope} relationship={limitKey ? 'rule' : undefined} />
          {limitKey && (
            <LimitKey value={limitKey} relationship="scope" showCopy={false} />
          )}
        </ChipGroup>
      </span>
    </TruncateWithTooltip>
  );
}
