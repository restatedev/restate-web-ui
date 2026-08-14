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

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 items-center align-middle',
    identity: 'min-w-0',
    identityIcon:
      'h-3.5 w-3.5 shrink-0 [&_path:first-child]:origin-[12px_14px] [&_path:first-child]:transition-transform',
  },
  variants: {
    variant: {
      default: {},
      header: {},
      table: { root: 'w-full' },
    },
    atCapacity: {
      false: {
        identityIcon: 'text-zinc-400 [&_path:first-child]:rotate-[-75deg]',
      },
      true: {
        identityIcon:
          'text-amber-600 [&_path:first-child]:rotate-[75deg] [&_path:first-child]:animate-gaugePressure motion-reduce:[&_path:first-child]:animate-none',
      },
    },
  },
  defaultVariants: { variant: 'default', atCapacity: false },
});

export interface LimitCounterTargetProps {
  scope: string;
  l1?: string;
  l2?: string;
  href?: string;
  className?: string;
  variant?: ChipGroupVariant | 'table';
  density?: ChipGroupDensity;
  showIcon?: boolean;
  showChevron?: boolean;
  usage?: number | null;
  limit?: number | null;
}

export function LimitCounterTarget({
  scope,
  l1,
  l2,
  href,
  className,
  variant = 'default',
  density,
  showIcon,
  showChevron,
  usage,
  limit,
}: LimitCounterTargetProps) {
  const limitKey = [l1, l2].filter(Boolean).join('/');
  const identity = [scope, limitKey].filter(Boolean).join('/');
  const resolvedDensity =
    density ?? (variant === 'header' ? 'default' : 'compact');
  const chipVariant = variant === 'header' ? 'header' : 'default';
  const resolvedShowIcon = showIcon ?? variant !== 'header';
  const atCapacity = usage != null && limit != null && usage >= limit;
  const resolvedShowChevron =
    showChevron ?? (variant === 'table' && Boolean(href));
  const {
    root,
    identity: identityStyles,
    identityIcon,
  } = styles({ variant, atCapacity });

  const target = (
    <span className={root({ className })} data-limit-counter={identity}>
      <ChipGroup
        variant={chipVariant}
        density={resolvedDensity}
        href={href}
        aria-label={`Limit counter ${identity}`}
        className={identityStyles({
          className: variant === 'table' ? 'w-full' : undefined,
        })}
      >
        <Scope
          value={scope}
          icon={resolvedShowIcon ? IconName.Gauge : undefined}
          iconClassName={identityIcon()}
          relationship={limitKey ? 'target' : undefined}
          showChevron={resolvedShowChevron && !limitKey}
        />
        {limitKey && (
          <LimitKey
            value={limitKey}
            relationship="scope"
            showCopy={false}
            showChevron={resolvedShowChevron}
          />
        )}
      </ChipGroup>
    </span>
  );

  return (
    <TruncateWithTooltip
      tooltipContent={identity}
      copyText={identity}
      hideCopy={variant !== 'table'}
      overflowVisible
      containerClassName={variant === 'table' ? 'w-full' : undefined}
    >
      {target}
    </TruncateWithTooltip>
  );
}
