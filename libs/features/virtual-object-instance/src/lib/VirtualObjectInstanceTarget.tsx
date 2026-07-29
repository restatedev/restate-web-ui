import {
  Chip,
  ChipGroup,
  ChipSegment,
  type ChipGroupVariant,
} from '@restate/ui/chip';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import {
  formatVirtualObjectInstanceIdentity,
  type VirtualObjectInstanceIdentity,
} from './identity';

const targetStyles = tv({
  slots: {
    serviceLink:
      'inline-flex max-w-full min-w-0 no-underline transition-[filter] hover:brightness-[0.98] pressed:brightness-[0.96]',
    chip: 'h-6.5 max-w-full text-xs font-medium text-zinc-600',
    service: 'max-w-[18rem] bg-white pl-1.5 font-medium text-zinc-600',
    key: 'max-w-[28rem] bg-zinc-50 font-mono text-[90%] text-zinc-500',
    scope: 'max-w-[22rem] bg-zinc-100 font-mono text-[90%] text-zinc-600',
    serviceIcon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
    instanceIcon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
    scopeBadge:
      'inline-flex h-4 shrink-0 items-center rounded border border-zinc-300/80 bg-white/80 px-1 font-sans text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-zinc-500',
  },
  variants: {
    showService: {
      true: {},
      false: {
        key: 'bg-white pl-1.5 font-sans text-xs font-medium text-zinc-600',
      },
    },
  },
});

export interface VirtualObjectInstanceTargetProps {
  identity: VirtualObjectInstanceIdentity;
  className?: string;
  containerClassName?: string;
  variant?: ChipGroupVariant;
  href?: string;
  serviceHref?: string;
  showService?: boolean;
}

export function VirtualObjectInstanceTarget({
  identity,
  className,
  containerClassName,
  variant,
  href,
  serviceHref,
  showService = true,
}: VirtualObjectInstanceTargetProps) {
  const { service, key, scope } = identity;
  const copyText = formatVirtualObjectInstanceIdentity(identity);
  const {
    serviceLink,
    chip,
    service: serviceStyle,
    key: keyStyle,
    scope: scopeStyle,
    serviceIcon,
    instanceIcon,
    scopeBadge,
  } = targetStyles({ showService });

  const serviceChip = (
    <Chip left="straight" right="angled" className={chip({ className })}>
      <ChipSegment className={serviceStyle()}>
        <Icon name={IconName.Box} className={serviceIcon()} />
        <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
      </ChipSegment>
    </Chip>
  );

  const chips = (
    <>
      {showService &&
        (serviceHref ? (
          <Link
            href={serviceHref}
            aria-label={`Open ${service} service`}
            variant="secondary"
            className={serviceLink()}
          >
            {serviceChip}
          </Link>
        ) : (
          serviceChip
        ))}
      <Chip
        left={showService ? 'angled' : 'straight'}
        right={scope === undefined ? 'straight' : 'angled'}
        className={chip({ className })}
      >
        <ChipSegment className={keyStyle()}>
          <Icon name={IconName.VirtualObject} className={instanceIcon()} />
          <TruncateTooltipTrigger>{key || <>&nbsp;</>}</TruncateTooltipTrigger>
        </ChipSegment>
      </Chip>
      {scope !== undefined && (
        <Chip left="angled" right="straight" className={chip({ className })}>
          <ChipSegment className={scopeStyle()}>
            <span className={scopeBadge()}>SCOPE</span>
            <TruncateTooltipTrigger>
              {scope || <>&nbsp;</>}
            </TruncateTooltipTrigger>
          </ChipSegment>
        </Chip>
      )}
    </>
  );

  return (
    <TruncateWithTooltip
      tooltipContent={copyText}
      copyText={copyText}
      overflowVisible
    >
      <ChipGroup
        variant={variant}
        href={!showService || !serviceHref ? href : undefined}
        aria-label={href ? `Virtual object instance ${copyText}` : undefined}
        className={containerClassName}
      >
        {chips}
      </ChipGroup>
    </TruncateWithTooltip>
  );
}
