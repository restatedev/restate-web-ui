import {
  ChipGroup,
  type ChipGroupDensity,
  type ChipGroupVariant,
} from '@restate/ui/chip';
import { IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { LimitKey } from './LimitKey';
import { Scope } from './Scope';

export type LimitRuleLevel = 'scope' | 'level1' | 'level2';
export type LimitRuleTargetVariant = ChipGroupVariant | 'table';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 items-center align-middle',
    identity: 'min-w-0',
    identityIcon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
  },
  variants: {
    variant: {
      default: {},
      header: {},
      table: {
        root: 'w-full',
        identity: 'w-full',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface LimitRuleTargetProps {
  pattern: string;
  href?: string;
  className?: string;
  variant?: LimitRuleTargetVariant;
  density?: ChipGroupDensity;
  showIcon?: boolean;
  showChevron?: boolean;
  showTooltip?: boolean;
}

export function getLimitRuleLevel(pattern: string): LimitRuleLevel {
  const components = pattern.split('/');
  if (components.length >= 3) return 'level2';
  if (components.length === 2) return 'level1';
  return 'scope';
}

export function LimitRuleTarget({
  pattern,
  href,
  className,
  variant = 'default',
  density,
  showIcon,
  showChevron,
  showTooltip = true,
}: LimitRuleTargetProps) {
  const [scope = '', level1, level2] = pattern.split('/');
  if (!scope) return null;

  const limitKey = [level1, level2].filter(Boolean).join('/');
  const level = getLimitRuleLevel(pattern);
  const resolvedDensity =
    density ?? (variant === 'header' ? 'default' : 'compact');
  const chipVariant = variant === 'header' ? 'header' : 'default';
  const resolvedShowIcon = showIcon ?? variant !== 'header';
  const resolvedShowChevron =
    showChevron ?? (variant === 'table' && Boolean(href));
  const { root, identity, identityIcon } = styles({ variant });

  const target = (
    <span
      className={root({ className })}
      data-limit-rule={pattern}
      data-limit-rule-level={level}
    >
      <ChipGroup
        variant={chipVariant}
        density={resolvedDensity}
        href={href}
        aria-label={`Limit rule ${pattern}`}
        className={identity()}
      >
        <Scope
          value={scope}
          icon={resolvedShowIcon ? IconName.Filters : undefined}
          iconClassName={identityIcon()}
          relationship={limitKey ? 'rule' : undefined}
          showChevron={resolvedShowChevron && !limitKey}
        />
        {limitKey && (
          <LimitKey
            value={limitKey}
            relationship="scope"
            showCopy={false}
            showChevron={resolvedShowChevron}
            showTooltip={showTooltip}
          />
        )}
      </ChipGroup>
    </span>
  );

  if (!showTooltip) return target;

  return (
    <TruncateWithTooltip
      tooltipContent={pattern}
      copyText={pattern}
      hideCopy={variant !== 'table'}
      overflowVisible
      containerClassName={variant === 'table' ? 'w-full' : undefined}
    >
      {target}
    </TruncateWithTooltip>
  );
}
