import { Scope } from '@restate/features-vqueue-ui';
import {
  Chip,
  ChipGroup,
  ChipSegment,
  type ChipGroupDensity,
  type ChipGroupVariant,
} from '@restate/ui-chip';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import {
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import {
  formatVirtualObjectInstanceIdentity,
  type VirtualObjectInstanceIdentity,
} from './identity';

const targetStyles = tv({
  slots: {
    serviceLink:
      'inline-flex max-w-full min-w-0 no-underline transition-[filter] hover:brightness-[0.98] pressed:brightness-[0.96]',
    chip: 'max-w-full text-xs font-medium text-tertiary',
    service: 'max-w-[18rem] bg-surface pl-1.5 font-medium text-tertiary',
    key: 'max-w-[28rem] bg-subtle font-mono text-[90%] text-muted',
    serviceIcon: 'h-3.5 w-3.5 shrink-0 text-subtle',
    instanceIcon: 'h-3.5 w-3.5 shrink-0 text-subtle',
    chevron: '-mr-1.5 h-3.5 w-3.5 shrink-0 text-subtle',
  },
  variants: {
    showService: {
      true: {},
      false: {
        key: 'bg-surface pl-1.5 font-sans text-xs font-medium text-tertiary',
      },
    },
    hasLeadingScope: {
      true: {
        service: 'pl-2',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      showService: false,
      hasLeadingScope: true,
      class: {
        key: 'pl-2',
      },
    },
  ],
});

export interface VirtualObjectInstanceTargetProps {
  identity: VirtualObjectInstanceIdentity;
  className?: string;
  containerClassName?: string;
  variant?: ChipGroupVariant;
  density?: ChipGroupDensity;
  href?: string;
  serviceHref?: string;
  showService?: boolean;
  showKeyIcon?: boolean;
}

export function VirtualObjectInstanceTarget({
  identity,
  className,
  containerClassName,
  variant,
  density,
  href,
  serviceHref,
  showService = true,
  showKeyIcon = true,
}: VirtualObjectInstanceTargetProps) {
  const { service, key, scope } = identity;
  const hasVisibleScope = Boolean(scope);
  const resolvedDensity =
    density ?? (variant === 'header' ? 'default' : 'compact');
  const copyText = formatVirtualObjectInstanceIdentity(identity);
  const {
    serviceLink,
    chip,
    service: serviceStyle,
    key: keyStyle,
    serviceIcon,
    instanceIcon,
    chevron,
  } = targetStyles({
    showService,
    hasLeadingScope: hasVisibleScope,
  });

  const serviceChip = (
    <Chip
      left={hasVisibleScope ? 'angled' : 'straight'}
      right="angled"
      size="lg"
      className={chip({ className })}
    >
      <ChipSegment className={serviceStyle()}>
        <Icon name={IconName.Box} className={serviceIcon()} />
        <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
        {serviceHref && (
          <Icon name={IconName.ChevronRight} className={chevron()} />
        )}
      </ChipSegment>
    </Chip>
  );

  const chips = (
    <>
      {hasVisibleScope && (
        <Scope value={scope} className={className} relationship="target" />
      )}
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
        left={showService || hasVisibleScope ? 'angled' : 'straight'}
        right="straight"
        size="lg"
        className={chip({ className })}
        href={showService && serviceHref ? href : undefined}
        aria-label={
          showService && serviceHref && href
            ? `Virtual object instance ${copyText}`
            : undefined
        }
      >
        <ChipSegment className={keyStyle()}>
          {showKeyIcon && (
            <Icon name={IconName.VirtualObject} className={instanceIcon()} />
          )}
          <TruncateTooltipTrigger>{key || <>&nbsp;</>}</TruncateTooltipTrigger>
          {href && <Icon name={IconName.ChevronRight} className={chevron()} />}
        </ChipSegment>
      </Chip>
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
        density={resolvedDensity}
        href={!showService || !serviceHref ? href : undefined}
        aria-label={href ? `Virtual object instance ${copyText}` : undefined}
        className={containerClassName}
      >
        {chips}
      </ChipGroup>
    </TruncateWithTooltip>
  );
}
