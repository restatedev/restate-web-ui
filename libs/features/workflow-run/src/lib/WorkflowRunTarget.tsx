import { Scope } from '@restate/features/vqueue-ui';
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
  formatWorkflowRunIdentity,
  type WorkflowRunIdentity,
} from './identity';

const targetStyles = tv({
  slots: {
    serviceLink:
      'inline-flex max-w-full min-w-0 no-underline transition-[filter] hover:brightness-[0.98] pressed:brightness-[0.96]',
    chip: 'max-w-full text-xs font-medium text-zinc-600',
    service: 'max-w-[18rem] bg-white pl-1.5 font-medium text-zinc-600',
    workflowId: 'max-w-[28rem] bg-zinc-50 font-mono text-[90%] text-zinc-500',
    icon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
  },
  variants: {
    showService: {
      true: {},
      false: {
        workflowId:
          'bg-white pl-1.5 font-sans text-xs font-medium text-zinc-600',
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
        workflowId: 'pl-2',
      },
    },
  ],
});

export interface WorkflowRunTargetProps {
  identity: WorkflowRunIdentity;
  className?: string;
  containerClassName?: string;
  variant?: ChipGroupVariant;
  href?: string;
  serviceHref?: string;
  showService?: boolean;
}

export function WorkflowRunTarget({
  identity,
  className,
  containerClassName,
  variant,
  href,
  serviceHref,
  showService = true,
}: WorkflowRunTargetProps) {
  const { service, id, scope } = identity;
  const hasVisibleScope = Boolean(scope);
  const copyText = formatWorkflowRunIdentity(identity);
  const {
    serviceLink,
    chip,
    service: serviceStyle,
    workflowId,
    icon,
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
        <Icon name={IconName.Box} className={icon()} />
        <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
      </ChipSegment>
    </Chip>
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
        aria-label={href ? `Workflow run ${copyText}` : undefined}
        className={containerClassName}
      >
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
        >
          <ChipSegment className={workflowId()}>
            <Icon name={IconName.Workflow} className={icon()} />
            <TruncateTooltipTrigger>{id || <>&nbsp;</>}</TruncateTooltipTrigger>
          </ChipSegment>
        </Chip>
      </ChipGroup>
    </TruncateWithTooltip>
  );
}
