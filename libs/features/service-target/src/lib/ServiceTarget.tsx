import type { ServiceType } from '@restate/data-access/admin-api-spec';
import { useListServices } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { virtualObjectInstanceHref } from '@restate/features/virtual-object-instance';
import { Scope } from '@restate/features/vqueue-ui';
import { workflowRunHref } from '@restate/features/workflow-run';
import {
  Chip,
  ChipGroup,
  ChipSegment,
  type ChipGroupVariant,
} from '@restate/ui/chip';
import { Icon, IconName } from '@restate/ui/icons';
import {
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { panelHref } from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 flex-auto items-center align-middle',
    group: 'w-full',
    scopeChip:
      'flex-[0_1_auto] [&_[data-chip-root]]:w-full [&>[data-chip]]:w-full',
    serviceChip: 'flex-[0_1_auto] [&>[data-chip-root]]:w-full',
    keyChip: 'flex-[0_2_auto] [&>[data-chip-root]]:w-full',
    handlerChip: 'flex-[0_1_auto] [&>[data-chip-root]]:w-full',
    trailingChip: 'flex-[0_1_auto] [&>[data-chip-root]]:w-full',
    chip: 'max-w-full text-xs font-medium text-zinc-600',
    service: 'min-w-0 bg-white pl-2 font-medium text-zinc-600',
    key: 'min-w-0 bg-zinc-50 pr-1.5 pl-2 font-mono text-[90%] text-zinc-500',
    handler:
      'min-w-0 bg-zinc-100 pr-2 pl-1 font-medium text-zinc-600/80 italic',
    trailing: 'min-w-0 bg-zinc-100 px-1.5 text-zinc-600/80',
    serviceIcon: 'h-3 w-3 shrink-0 text-zinc-400',
    icon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
    handlerIcon: '-mr-1 h-5 w-5 shrink-0 text-zinc-400',
  },
  variants: {
    density: {
      default: {},
      compact: {
        root: 'h-6',
        chip: 'h-6',
      },
    },
    hasJoins: {
      true: {},
      false: {},
    },
    isHeader: {
      true: {
        group:
          'mix-blend-normal! [&>[data-chip]]:mix-blend-luminosity [&>[data-scope]]:mix-blend-normal!',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      density: 'compact',
      hasJoins: true,
      class: {
        chip: 'h-5.5',
      },
    },
  ],
  defaultVariants: {
    density: 'default',
  },
});

const tooltipStyles = tv({
  slots: {
    root: 'grid max-w-96 min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 py-0.5 text-left',
    term: 'font-sans font-medium whitespace-nowrap opacity-55',
    description: 'min-w-0 font-mono break-all',
  },
});

export interface ServiceTargetProps {
  scope?: string;
  service: string;
  serviceKey?: string;
  handler?: string;
  serviceType?: ServiceType | 'service' | 'virtual_object' | 'workflow';
  showHandler?: boolean;
  links?: ServiceTargetLinks;
  className?: string;
  chipClassName?: string;
  variant?: ChipGroupVariant;
  density?: 'default' | 'compact';
}

export type ServiceTargetSegment =
  | 'scope'
  | 'service'
  | 'serviceKey'
  | 'handler';

export interface ServiceTargetLink {
  href: string;
  ariaLabel?: string;
}

export type ServiceTargetLinks =
  | 'auto'
  | false
  | Partial<Record<ServiceTargetSegment, ServiceTargetLink | false>>;

type ServiceTargetServiceType = ServiceTargetProps['serviceType'];

function resolveServiceType(serviceType?: ServiceTargetServiceType) {
  return serviceType === 'service'
    ? 'Service'
    : serviceType === 'virtual_object'
      ? 'VirtualObject'
      : serviceType === 'workflow'
        ? 'Workflow'
        : serviceType;
}

export function getServiceTargetEntityLink({
  baseUrl,
  scope,
  service,
  serviceKey,
  serviceType,
}: {
  baseUrl: string;
  scope?: string;
  service: string;
  serviceKey: string;
  serviceType?: ServiceTargetServiceType;
}): ServiceTargetLink | undefined {
  const resolvedServiceType = resolveServiceType(serviceType);
  const identityScope = scope === undefined ? {} : { scope };
  return resolvedServiceType === 'VirtualObject'
    ? {
        href: virtualObjectInstanceHref(baseUrl, {
          service,
          key: serviceKey,
          ...identityScope,
        }),
        ariaLabel: `Open virtual object instance ${service} / ${serviceKey}`,
      }
    : resolvedServiceType === 'Workflow'
      ? {
          href: workflowRunHref(baseUrl, {
            service,
            id: serviceKey,
            ...identityScope,
          }),
          ariaLabel: `Open workflow run ${service} / ${serviceKey}`,
        }
      : undefined;
}

function resolveSegmentLink({
  links,
  segment,
  automaticLink,
  fallbackAriaLabel,
}: {
  links?: ServiceTargetLinks;
  segment: ServiceTargetSegment;
  automaticLink?: ServiceTargetLink;
  fallbackAriaLabel: string;
}): ServiceTargetLink | undefined {
  const link =
    links === undefined || links === 'auto'
      ? automaticLink
      : links === false
        ? undefined
        : links[segment] || undefined;
  return link
    ? {
        ...link,
        ariaLabel: link.ariaLabel ?? fallbackAriaLabel,
      }
    : undefined;
}

function ServiceTargetContent({
  scope,
  service,
  serviceKey,
  handler,
  serviceType,
  showHandler = true,
  links,
  className,
  chipClassName,
  variant,
  density,
  children,
}: PropsWithChildren<ServiceTargetProps>) {
  const { baseUrl } = useRestateContext();
  const resolvedServiceType = resolveServiceType(serviceType);
  const hasServiceKey = typeof serviceKey === 'string';
  const hasVisibleScope = Boolean(scope);
  const hasVisibleHandler = showHandler && Boolean(handler);
  const hasTrailingContent = Boolean(children);
  const hasJoins =
    hasVisibleScope || hasServiceKey || hasVisibleHandler || hasTrailingContent;
  const target = [
    service,
    ...(hasServiceKey ? [serviceKey] : []),
    ...(hasVisibleHandler ? [handler] : []),
  ].join('/');
  const handlerHref = handler ? panelHref({ service, handler }) : undefined;
  const entity = hasServiceKey
    ? getServiceTargetEntityLink({
        baseUrl,
        scope,
        service,
        serviceKey,
        serviceType: resolvedServiceType,
      })
    : undefined;
  const identityHref = hasServiceKey
    ? (entity?.href ?? (!hasVisibleHandler ? handlerHref : undefined))
    : handlerHref;
  const identityLabel =
    entity?.ariaLabel ??
    (handler ? `Open ${service} / ${handler} handler` : undefined);
  const automaticIdentityLink = identityHref
    ? { href: identityHref, ariaLabel: identityLabel }
    : undefined;
  const automaticHandlerLink = handlerHref
    ? {
        href: handlerHref,
        ariaLabel: `Open ${service} / ${handler} handler`,
      }
    : undefined;
  const scopeLink = resolveSegmentLink({
    links,
    segment: 'scope',
    fallbackAriaLabel: `Open scope ${scope}`,
  });
  const serviceLink = resolveSegmentLink({
    links,
    segment: 'service',
    automaticLink: automaticIdentityLink,
    fallbackAriaLabel: `Open service ${service}`,
  });
  const serviceKeyLink = resolveSegmentLink({
    links,
    segment: 'serviceKey',
    automaticLink: automaticIdentityLink,
    fallbackAriaLabel: `Open service key ${serviceKey}`,
  });
  const handlerLink = resolveSegmentLink({
    links,
    segment: 'handler',
    automaticLink: automaticHandlerLink,
    fallbackAriaLabel: `Open ${service} / ${handler} handler`,
  });
  const {
    root,
    group,
    scopeChip,
    serviceChip: serviceChipContainer,
    keyChip: keyChipContainer,
    handlerChip: handlerChipContainer,
    trailingChip,
    chip,
    service: serviceStyle,
    key,
    handler: handlerStyle,
    trailing,
    serviceIcon,
    icon,
    handlerIcon,
  } = styles({
    density,
    hasJoins,
    isHeader: variant === 'header',
  });
  const { root: tooltip, term, description } = tooltipStyles();
  const serviceLabel =
    resolvedServiceType === 'Workflow'
      ? 'Workflow'
      : resolvedServiceType === 'VirtualObject'
        ? 'Virtual Object'
        : 'Service';
  const keyLabel =
    resolvedServiceType === 'Workflow'
      ? 'Workflow ID'
      : resolvedServiceType === 'VirtualObject'
        ? 'Object key'
        : 'Service key';
  const tooltipContent = (
    <dl className={tooltip()} data-service-target-tooltip>
      {hasVisibleScope && (
        <>
          <dt className={term()}>Scope</dt>
          <dd className={description()}>{scope}</dd>
        </>
      )}
      <dt className={term()}>{serviceLabel}</dt>
      <dd className={description()}>{service}</dd>
      {hasServiceKey && (
        <>
          <dt className={term()}>{keyLabel}</dt>
          <dd className={description()}>{serviceKey}</dd>
        </>
      )}
      {hasVisibleHandler && (
        <>
          <dt className={term()}>Handler</dt>
          <dd className={description()}>{handler}()</dd>
        </>
      )}
    </dl>
  );
  const serviceChip = (
    <Chip
      left={hasVisibleScope ? 'angled' : 'straight'}
      right={
        hasServiceKey || hasVisibleHandler || hasTrailingContent
          ? 'angled'
          : 'straight'
      }
      size="lg"
      className={chip({ className: chipClassName })}
      containerClassName={serviceChipContainer()}
      href={serviceLink?.href}
      aria-label={serviceLink?.ariaLabel}
    >
      <ChipSegment className={serviceStyle()}>
        <Icon name={IconName.Box} className={serviceIcon()} />
        <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
      </ChipSegment>
    </Chip>
  );
  const handlerChip = handler ? (
    <Chip
      left="angled"
      right={hasTrailingContent ? 'angled' : 'straight'}
      size="lg"
      className={chip({ className: chipClassName })}
      containerClassName={handlerChipContainer()}
      href={handlerLink?.href}
      aria-label={handlerLink?.ariaLabel}
    >
      <ChipSegment className={handlerStyle()}>
        <Icon name={IconName.Function} className={handlerIcon()} />
        <TruncateTooltipTrigger>{handler}()</TruncateTooltipTrigger>
      </ChipSegment>
    </Chip>
  ) : null;
  const keyIcon =
    resolvedServiceType === 'Workflow'
      ? IconName.Workflow
      : resolvedServiceType === 'VirtualObject'
        ? IconName.VirtualObject
        : undefined;
  const serviceKeyChip = hasServiceKey ? (
    <Chip
      left="angled"
      right={hasVisibleHandler || hasTrailingContent ? 'angled' : 'straight'}
      size="lg"
      className={chip({ className: chipClassName })}
      containerClassName={keyChipContainer()}
      href={serviceKeyLink?.href}
      aria-label={serviceKeyLink?.ariaLabel}
    >
      <ChipSegment className={key()}>
        {keyIcon && <Icon name={keyIcon} className={icon()} />}
        <TruncateTooltipTrigger>
          {serviceKey || <>&nbsp;</>}
        </TruncateTooltipTrigger>
      </ChipSegment>
    </Chip>
  ) : null;

  return (
    <span className={root({ className })} data-service-target>
      <TruncateWithTooltip
        tooltipContent={tooltipContent}
        copyText={target}
        containerClassName="min-w-0 flex-auto"
        overflowVisible
      >
        <ChipGroup variant={variant} className={group()}>
          {hasVisibleScope && (
            <Scope
              value={scope}
              className={chip({ className: chipClassName })}
              containerClassName={scopeChip()}
              segmentClassName="max-w-none"
              relationship="target"
              href={scopeLink?.href}
              aria-label={scopeLink?.ariaLabel}
            />
          )}
          {serviceChip}
          {serviceKeyChip}
          {hasVisibleHandler && handlerChip}
          {hasTrailingContent && (
            <Chip
              left="angled"
              right="straight"
              size="lg"
              className={chip({ className: chipClassName })}
              containerClassName={trailingChip()}
            >
              <ChipSegment className={trailing()}>{children}</ChipSegment>
            </Chip>
          )}
        </ChipGroup>
      </TruncateWithTooltip>
    </span>
  );
}

function CatalogServiceTarget(
  props: PropsWithChildren<Omit<ServiceTargetProps, 'serviceType'>>,
) {
  const { data: services } = useListServices();
  return (
    <ServiceTargetContent
      {...props}
      serviceType={services.get(props.service)?.ty}
    />
  );
}

export function ServiceTarget({
  serviceType,
  ...props
}: PropsWithChildren<ServiceTargetProps>) {
  return serviceType ? (
    <ServiceTargetContent {...props} serviceType={serviceType} />
  ) : (
    <CatalogServiceTarget {...props} />
  );
}
