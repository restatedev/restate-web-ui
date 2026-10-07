import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import {
  getProtocolType,
  isHttpDeployment,
  type Deployment as DeploymentData,
  type DetailedDeployment,
  type Handler,
} from '@restate/data-access/admin-api-spec';
import {
  Deployment,
  MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION,
  SDK,
} from '@restate/features/deployment';
import { ProtocolTypeExplainer } from '@restate/features/explainers';
import { GithubMetadata, hasGithubMetadata } from '@restate/features/options';
import { useRestateContext } from '@restate/features/restate-context';
import {
  AbortTimeoutIllustration,
  AccessIllustration,
  InactivityTimeoutIllustration,
  RetentionExplanation,
  RetentionIllustration,
  RetryPolicyExplanation,
  RetryPolicyIllustration,
  SERVICE_ACCESS_EDIT,
  SERVICE_RETENTION_EDIT,
  SERVICE_TIMEOUT_EDIT,
  StateLoadingIllustration,
} from '@restate/features/service-details';
import { Button } from '@restate/ui/button';
import {
  Card,
  CardButtonRow,
  CardHeader,
  CardLinkRow,
  CardRow,
} from '@restate/ui/card';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { HoverTooltip, InlineTooltip, RelativeDate } from '@restate/ui/tooltip';
import { humanTimeToMs } from '@restate/util/humantime';
import { deploymentHref } from '@restate/util/panel';
import { formatNumber } from '@restate/util/intl';
import { WarningChip } from './WarningChip';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { formatConfigDuration, type ServiceConfig } from './serviceConfig';

const skeletonStyles = tv({
  base: 'inline-block animate-pulse rounded-full bg-gray-200/70',
  variants: {
    variant: {
      hero: 'h-6 w-16',
      default: 'h-4 w-12',
    },
  },
  defaultVariants: { variant: 'default' },
});

const captionStyles = tv({
  base: 'flex min-w-0 items-center gap-1 text-2xs font-medium text-gray-400',
  variants: {
    tone: {
      default: '',
      warning: 'text-orange-700',
    },
  },
  defaultVariants: { tone: 'default' },
});

function Skeleton({ variant }: { variant?: 'hero' | 'default' }) {
  return <span className={skeletonStyles({ variant })} />;
}

function HeroText({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-auto">
      <div className="text-0.5xs font-medium text-gray-500">{title}</div>
      {description && (
        <div className="mt-0.5 truncate text-2xs text-gray-400">
          {description}
        </div>
      )}
    </div>
  );
}

export function CardEditAction({
  param,
  value,
  label = 'Edit',
}: {
  param: string;
  value: string;
  label?: string;
}) {
  const [, setSearchParams] = useSearchParams();
  return (
    <Button
      variant="icon"
      className="flex h-6 items-center gap-1 rounded-md px-1.5 text-2xs font-medium text-gray-400 hover:bg-transparent hover:text-gray-600"
      onClick={() =>
        setSearchParams(
          (old) => {
            old.set(param, value);
            return old;
          },
          { preventScrollReset: true },
        )
      }
    >
      <Icon name={IconName.Pencil} className="h-3 w-3" />
      {label}
    </Button>
  );
}

type DeploymentLike = DeploymentData | DetailedDeployment;

export function useIsDeprecatedDeployment(deployment?: DeploymentLike) {
  const { isVersionGte } = useRestateContext();
  return Boolean(
    deployment &&
    deployment.max_protocol_version < MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION &&
    isVersionGte?.('1.6.0'),
  );
}

export function DeploymentSdkRow({
  deployment,
}: {
  deployment?: DeploymentLike;
}) {
  const isDeprecated = useIsDeprecatedDeployment(deployment);
  if (!deployment || (!deployment.sdk_version && !isDeprecated)) {
    return null;
  }
  return (
    <CardRow>
      {deployment.sdk_version ? (
        <SDK
          lastAttemptServer={deployment.sdk_version}
          className="-mt-0.5 min-w-0 flex-auto gap-2 text-xs font-medium text-zinc-600"
        />
      ) : (
        <span className="flex-auto text-xs text-gray-500">
          No SDK version reported
        </span>
      )}
      {isDeprecated && (
        <WarningChip
          label="Unsupported SDK"
          title="Unsupported SDK version"
          messages={[
            <>
              This deployment uses an obsolete SDK version that speaks service
              protocol{' '}
              <code className="font-mono font-semibold">
                v{deployment.max_protocol_version}
              </code>{' '}
              at most, but this Restate version requires{' '}
              <code className="font-mono font-semibold">
                v{MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION}
              </code>{' '}
              or newer. Upgrade the SDK and register a new deployment.
            </>,
          ]}
        />
      )}
    </CardRow>
  );
}

export function DeploymentProtocolRows({
  deployment,
}: {
  deployment?: DeploymentLike;
}) {
  return (
    <>
      <CardRow
        label={
          <span className="flex items-center gap-1">
            Protocol
            <ProtocolTypeExplainer
              variant="indicator-button"
              className="text-gray-400"
            />
          </span>
        }
      >
        {deployment ? (
          <div className="flex min-w-0 items-center justify-end gap-1">
            <ConfigChip
              label="type"
              value={
                getProtocolType(deployment) === 'BidiStream'
                  ? 'Bidirectional'
                  : 'Request/Response'
              }
            />
            {isHttpDeployment(deployment) && (
              <ConfigChip
                label="http"
                value={deployment.http_version.replace(/^HTTP\//, '')}
              />
            )}
          </div>
        ) : (
          <Skeleton />
        )}
      </CardRow>
      <CardRow label="Service protocol">
        {deployment ? (
          <ConfigChip
            label="supports"
            value={
              deployment.min_protocol_version ===
              deployment.max_protocol_version
                ? `v${deployment.max_protocol_version}`
                : `v${deployment.min_protocol_version} – v${deployment.max_protocol_version}`
            }
          />
        ) : (
          <Skeleton />
        )}
      </CardRow>
    </>
  );
}

export function RegisteredCaption({ date }: { date?: string }) {
  if (!date) {
    return null;
  }
  return (
    <span className={captionStyles()}>
      Registered
      <RelativeDate
        date={date}
        title="Registered at"
        className="text-2xs font-medium text-gray-500"
      />
    </span>
  );
}

export function DeploymentCard({
  deploymentId,
  revision,
}: {
  deploymentId?: string;
  revision?: number;
}) {
  const { baseUrl } = useRestateContext();
  const { data } = useListDeployments();
  const deployment = deploymentId
    ? data?.deployments.get(deploymentId)
    : undefined;
  const isDeprecated = useIsDeprecatedDeployment(deployment);

  return (
    <Card intent={isDeprecated ? 'warning' : 'none'}>
      <CardHeader title="Latest deployment" icon={IconName.Http}>
        <RegisteredCaption date={deployment?.created_at} />
      </CardHeader>
      {deploymentId ? (
        <CardLinkRow
          variant="hero"
          href={deploymentHref(baseUrl, { deployment: deploymentId })}
          aria-label="Open deployment"
          allowsInteractiveChildren
          className="gap-0.5"
        >
          <Deployment
            deploymentId={deploymentId}
            revision={revision}
            highlightSelection={false}
            showLink={false}
            className="m-0 w-full max-w-full p-0 font-normal text-inherit"
          />
        </CardLinkRow>
      ) : (
        <CardRow variant="hero">
          <HeroText title="Latest revision" />
          <Skeleton variant="hero" />
        </CardRow>
      )}
      <DeploymentSdkRow deployment={deployment} />
      {deployment && hasGithubMetadata(deployment.metadata) && (
        <CardRow>
          <GithubMetadata
            metadata={deployment.metadata}
            className="w-full pl-0.5"
          />
        </CardRow>
      )}
      <DeploymentProtocolRows deployment={deployment} />
    </Card>
  );
}

const configChipStyles = tv({
  slots: {
    chip: 'inline-flex h-5 max-w-full min-w-0 items-stretch overflow-hidden rounded-md border border-gray-200 bg-white text-xs font-medium text-zinc-600 shadow-xs',
    tag: 'flex shrink-0 items-center border-r border-gray-200 bg-zinc-100/80 px-1 text-[8.5px] leading-none font-semibold tracking-[0.04em] text-zinc-500 uppercase',
    value:
      'flex min-w-0 items-center gap-1 px-1.5 font-mono text-[11px] text-zinc-700',
    valueText: 'min-w-0 truncate',
    icon: 'h-3 w-3 shrink-0 text-zinc-400',
    warningIcon: 'h-3 w-3 shrink-0 text-orange-500',
  },
  variants: {
    hue: {
      neutral: {},
      blue: {
        tag: 'bg-blue-50/70 text-blue-700/90',
        icon: 'text-blue-500/80',
      },
      green: {
        tag: 'bg-green-50/80 text-green-700/90',
        icon: 'text-green-600/80',
      },
      amber: {
        tag: 'bg-amber-50/80 text-amber-800/90',
        icon: 'text-amber-600/80',
      },
      gray: {
        tag: 'bg-zinc-200/50 text-zinc-600',
        icon: 'text-zinc-500',
      },
    },
    tone: {
      default: {},
      override: {
        chip: 'border-dashed',
      },
      warning: {
        tag: 'bg-red-50 text-red-700',
        icon: 'text-red-500',
      },
    },
  },
  defaultVariants: { hue: 'neutral', tone: 'default' },
});

type ConfigChipHue = 'neutral' | 'blue' | 'green' | 'amber' | 'gray';

interface ConfigChipProps {
  label?: string;
  icon?: IconName;
  value: ReactNode;
  hue?: ConfigChipHue;
  tone?: 'default' | 'override' | 'warning';
  warning?: boolean;
}

function ConfigChip({
  label,
  icon,
  value,
  hue = 'neutral',
  tone = 'default',
  warning = false,
}: ConfigChipProps) {
  const styles = configChipStyles({ hue, tone });
  return (
    <span className={styles.chip()}>
      {label && <span className={styles.tag()}>{label}</span>}
      <span className={styles.value()}>
        {warning && (
          <Icon
            name={IconName.TriangleAlert}
            className={styles.warningIcon()}
          />
        )}
        {icon && <Icon name={icon} className={styles.icon()} />}
        <span className={styles.valueText()}>{value}</span>
      </span>
    </span>
  );
}

function RowLabel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon name={icon} className="h-3.5 w-3.5" />
      </span>
      {children}
    </span>
  );
}

const configPopoverStyles = tv({
  base: 'flex flex-col',
  variants: {
    size: {
      default: 'w-[min(34rem,calc(100vw-2rem))]',
      wide: 'w-max max-w-[min(50rem,calc(100vw-2rem))]',
    },
  },
  defaultVariants: { size: 'default' },
});

const configPopoverIllustrationStyles = tv({
  base: 'mx-2 flex flex-col',
  variants: {
    frame: {
      boxed: 'gap-6 rounded-xl border bg-white px-3 pt-3 pb-2.5',
      none: 'gap-3',
    },
    trailing: {
      true: 'mb-3',
      false: '',
    },
  },
  defaultVariants: { frame: 'boxed', trailing: false },
});

function ConfigPopover({
  title,
  editParam,
  service,
  isReadonly,
  illustration,
  illustrationFrame,
  explanation,
  warnings,
  size,
}: {
  title: string;
  editParam?: string;
  service: string;
  isReadonly: boolean;
  illustration: ReactNode;
  illustrationFrame?: 'boxed' | 'none';
  explanation?: ReactNode;
  warnings?: ReactNode[];
  size?: 'default' | 'wide';
}) {
  const { close } = usePopover();
  const [, setSearchParams] = useSearchParams();
  return (
    <div className={configPopoverStyles({ size })}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        {editParam && !isReadonly && (
          <Button
            variant="icon"
            className="-my-1 ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-normal text-gray-500 hover:text-gray-700"
            onClick={() => {
              close?.();
              setSearchParams(
                (old) => {
                  old.set(editParam, service);
                  return old;
                },
                { preventScrollReset: true },
              );
            }}
          >
            <Icon name={IconName.Pencil} className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>
      {warnings?.map((warning, index) => (
        <div
          key={index}
          className="mx-2 mb-2 flex gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-700"
        >
          <Icon
            name={IconName.TriangleAlert}
            className="mt-px h-3.5 w-3.5 shrink-0 text-orange-500"
          />
          <span>{warning}</span>
        </div>
      ))}
      <div
        className={configPopoverIllustrationStyles({
          frame: illustrationFrame,
          trailing: !explanation,
        })}
      >
        {illustration}
      </div>
      {explanation && (
        <div className="w-0 min-w-full px-4 pt-3 pb-3 text-xs [&_ul]:space-y-2">
          {explanation}
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  label,
  icon,
  chips,
  isPending,
  popover,
}: {
  label: string;
  icon: IconName;
  chips: ConfigChipProps[];
  isPending: boolean;
  popover?: ReactNode;
}) {
  const content = (
    <div className="flex min-w-0 items-center justify-end gap-1">
      {chips.map((chip, index) => (
        <ConfigChip key={index} {...chip} />
      ))}
    </div>
  );
  if (!isPending && popover) {
    return (
      <Popover>
        <PopoverTrigger>
          <CardButtonRow
            label={<RowLabel icon={icon}>{label}</RowLabel>}
            aria-label={`${label} details`}
          >
            {content}
          </CardButtonRow>
        </PopoverTrigger>
        <PopoverContent placement="bottom end">{popover}</PopoverContent>
      </Popover>
    );
  }
  return (
    <CardRow label={<RowLabel icon={icon}>{label}</RowLabel>}>
      {isPending ? <Skeleton /> : content}
    </CardRow>
  );
}

function shortestHandlerName(handlers?: Handler[]) {
  return handlers
    ?.map((handler) => handler.name)
    .sort((a, b) => a.length - b.length)[0];
}

const EDIT_ACTIONS = [
  { key: SERVICE_ACCESS_EDIT, label: 'Access…' },
  { key: SERVICE_RETENTION_EDIT, label: 'Retention…' },
  { key: SERVICE_TIMEOUT_EDIT, label: 'Timeouts…' },
];

const editTriggerStyles = tv({
  base: 'flex h-6 items-center gap-1 rounded-md px-1.5 text-2xs font-medium text-gray-500 hover:bg-transparent hover:text-gray-600 disabled:text-gray-400',
});

function ConfigurationEditMenu({
  service,
  disabledReason,
}: {
  service: string;
  disabledReason?: ReactNode;
}) {
  const [, setSearchParams] = useSearchParams();
  const trigger = (
    <Button
      variant="icon"
      className={editTriggerStyles()}
      disabled={Boolean(disabledReason)}
    >
      Edit
      <Icon name={IconName.ChevronDown} className="h-3 w-3" />
    </Button>
  );
  if (disabledReason) {
    return (
      <HoverTooltip
        content={disabledReason}
        contentClassName="max-w-56 break-normal"
      >
        {trigger}
      </HoverTooltip>
    );
  }
  return (
    <Dropdown>
      <DropdownTrigger>{trigger}</DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Edit">
          <DropdownMenu
            onSelect={(key) =>
              setSearchParams(
                (old) => {
                  old.set(key, service);
                  return old;
                },
                { preventScrollReset: true },
              )
            }
          >
            {EDIT_ACTIONS.map((action) => (
              <DropdownItem key={action.key} value={action.key}>
                {action.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

export function ConfigurationCard({
  service,
  config,
  isWorkflow,
  handlers,
  revision,
  isPending,
  isReadonly,
  isKeyed = false,
}: {
  service: string;
  config: ServiceConfig;
  isWorkflow: boolean;
  handlers?: Handler[];
  revision?: number;
  isPending: boolean;
  isReadonly: boolean;
  isKeyed?: boolean;
}) {
  const { isVersionGte } = useRestateContext();
  const { data: deploymentsData } = useListDeployments();
  const supportsJournalRetention = isVersionGte?.('1.4.5') ?? false;
  const {
    public: access,
    journalRetention,
    idempotencyRetention,
    workflowCompletionRetention,
    inactivityTimeout,
    abortTimeout,
    retryPolicy,
    enableLazyState,
  } = config;
  const isPublic = access.value !== false;
  const isLazyState = enableLazyState.value === true;

  const deploymentIds =
    revision === undefined
      ? []
      : (deploymentsData?.services.get(service)?.deployments?.[revision] ?? []);
  const isRequestResponse = deploymentIds.some(
    (id) =>
      getProtocolType(deploymentsData?.deployments.get(id)) ===
      'RequestResponse',
  );

  const hasRetryLimit =
    retryPolicy.maxAttempts.value !== undefined &&
    retryPolicy.maxAttempts.value !== null;

  const journalMs = humanTimeToMs(journalRetention.value);
  const retentionCapMessages: ReactNode[] = [];
  if (
    supportsJournalRetention &&
    isWorkflow &&
    journalMs > 0 &&
    humanTimeToMs(workflowCompletionRetention) > 0 &&
    humanTimeToMs(workflowCompletionRetention) < journalMs
  ) {
    retentionCapMessages.push(
      <>
        For workflow executions, the journal retention period is capped at{' '}
        <code className="font-mono font-semibold">
          {workflowCompletionRetention}
        </code>
        .
      </>,
    );
  }
  if (
    supportsJournalRetention &&
    journalMs > 0 &&
    humanTimeToMs(idempotencyRetention.value) > 0 &&
    humanTimeToMs(idempotencyRetention.value) < journalMs
  ) {
    retentionCapMessages.push(
      <>
        For invocations with an idempotency key, the journal retention period is
        capped at{' '}
        <code className="font-mono font-semibold">
          {idempotencyRetention.value}
        </code>
        .
      </>,
    );
  }
  const isJournalCappedByOthers = retentionCapMessages.length > 0;
  const retentionChips: ConfigChipProps[] = [
    ...(supportsJournalRetention
      ? [
          {
            label: 'journal',
            warning: isJournalCappedByOthers,
            value: formatConfigDuration(journalRetention.value),
            tone: journalRetention.isOverride ? 'override' : 'default',
          } satisfies ConfigChipProps,
        ]
      : []),
    {
      label: 'idempotency',
      value: formatConfigDuration(idempotencyRetention.value),
      tone: idempotencyRetention.isOverride ? 'override' : 'default',
    },
    ...(isWorkflow && workflowCompletionRetention !== undefined
      ? [
          {
            label: 'workflow',
            value: formatConfigDuration(workflowCompletionRetention),
          } satisfies ConfigChipProps,
        ]
      : []),
  ];
  const timeoutChips: ConfigChipProps[] = [
    {
      label: 'inactivity',
      hue: 'gray',
      warning: isRequestResponse,
      value: inactivityTimeout.value ?? 'Default',
      tone: inactivityTimeout.isOverride ? 'override' : 'default',
    },
    {
      label: 'abort',
      hue: 'amber',
      value: abortTimeout.value ?? 'Default',
      tone: abortTimeout.isOverride ? 'override' : 'default',
    },
  ];
  const timeoutWarnings: ReactNode[] = isRequestResponse
    ? [
        <>
          The latest deployment uses Request/Response, so the inactivity timeout
          does not apply: Restate cannot ask the handler to suspend mid-request.
          It is only available with{' '}
          <code className="font-mono">Bidirectional</code> deployments.
        </>,
      ]
    : [];
  const onMaxAttempts = (
    retryPolicy.onMaxAttempts.value ?? 'Default'
  ).toLowerCase();
  const retryChips: ConfigChipProps[] = [
    {
      label: 'attempts',
      hue: 'amber',
      value: hasRetryLimit
        ? `${formatNumber(retryPolicy.maxAttempts.value ?? 0)}, then ${onMaxAttempts}`
        : 'No limit',
      tone:
        retryPolicy.maxAttempts.isOverride ||
        retryPolicy.onMaxAttempts.isOverride
          ? 'override'
          : 'default',
    },
    {
      label: 'backoff',
      hue: 'amber',
      value: `${retryPolicy.initialInterval.value ?? 'Default'} – ${retryPolicy.maxInterval.value ?? '∞'}`,
      tone:
        retryPolicy.initialInterval.isOverride ||
        retryPolicy.maxInterval.isOverride ||
        retryPolicy.exponentiationFactor.isOverride
          ? 'override'
          : 'default',
    },
  ];

  return (
    <Card intent="none">
      <CardHeader
        title="Configuration"
        icon={IconName.Settings}
        titleAddon={
          <InlineTooltip
            variant="indicator-button"
            title="Service configuration"
            description="Access decides whether the ingress may call this service. Retention sets how long completed invocations and idempotency keys are kept. Timeouts govern when an inactive handler is suspended or aborted. The retry policy applies to failing invocations."
            learnMoreHref="https://docs.restate.dev/services/configuration"
            className="ml-0.5 text-xs text-gray-400"
          />
        }
        action={
          <ConfigurationEditMenu
            service={service}
            disabledReason={
              isReadonly
                ? 'Configuration can only be edited at the service level. Deselect the handler to edit the service configuration.'
                : undefined
            }
          />
        }
      >
        {isReadonly && (
          <span className={captionStyles()}>Effective for this handler</span>
        )}
      </CardHeader>
      <ConfigRow
        label="Access"
        icon={IconName.ShieldCheck}
        isPending={isPending}
        chips={[
          {
            icon: isPublic ? IconName.Http : IconName.EyeOff,
            hue: 'blue',
            value: isPublic ? 'Public' : 'Private',
            tone: access.isOverride ? 'override' : 'default',
          },
        ]}
        popover={
          <ConfigPopover
            title="Access"
            size="wide"
            illustrationFrame="none"
            editParam={SERVICE_ACCESS_EDIT}
            service={service}
            isReadonly={isReadonly}
            illustration={
              <AccessIllustration
                isPublic={isPublic}
                service={service}
                handler={shortestHandlerName(handlers)}
                explanation
              />
            }
          />
        }
      />
      <ConfigRow
        label="Retention"
        icon={IconName.History}
        isPending={isPending}
        chips={retentionChips}
        popover={
          <ConfigPopover
            title="Retention"
            size="wide"
            warnings={retentionCapMessages}
            illustrationFrame="none"
            editParam={SERVICE_RETENTION_EDIT}
            service={service}
            isReadonly={isReadonly}
            illustration={
              <RetentionIllustration
                journal={
                  supportsJournalRetention ? journalRetention.value : undefined
                }
                idempotency={idempotencyRetention.value}
                workflow={workflowCompletionRetention}
                isWorkflow={isWorkflow}
                handlers={handlers}
              />
            }
            explanation={<RetentionExplanation isWorkflow={isWorkflow} />}
          />
        }
      />
      <ConfigRow
        label="Timeouts"
        icon={IconName.Timer}
        isPending={isPending}
        chips={timeoutChips}
        popover={
          <ConfigPopover
            title="Timeouts"
            size="wide"
            warnings={timeoutWarnings}
            illustrationFrame="none"
            editParam={SERVICE_TIMEOUT_EDIT}
            service={service}
            isReadonly={isReadonly}
            illustration={
              <>
                <InactivityTimeoutIllustration
                  inactivity={inactivityTimeout.value}
                  explanation
                />
                <AbortTimeoutIllustration
                  inactivity={inactivityTimeout.value}
                  abort={abortTimeout.value}
                  explanation
                />
              </>
            }
          />
        }
      />
      <ConfigRow
        label="Retry policy"
        icon={IconName.Retry}
        isPending={isPending}
        chips={retryChips}
        popover={
          <ConfigPopover
            title="Retry policy"
            size="wide"
            service={service}
            isReadonly={isReadonly}
            illustration={
              <RetryPolicyIllustration
                surface="white"
                maxAttempts={retryPolicy.maxAttempts.value}
                initialInterval={retryPolicy.initialInterval.value}
                maxInterval={retryPolicy.maxInterval.value}
                exponentiationFactor={retryPolicy.exponentiationFactor.value}
                onMaxAttempts={retryPolicy.onMaxAttempts.value}
              />
            }
            explanation={<RetryPolicyExplanation hasLimit={hasRetryLimit} />}
          />
        }
      />
      {isKeyed && (
        <ConfigRow
          label="State"
          icon={IconName.Database}
          isPending={isPending}
          chips={[
            {
              label: 'loading',
              value: isLazyState ? 'Lazy' : 'Eager',
              tone: enableLazyState.isOverride ? 'override' : 'default',
            },
          ]}
          popover={
            <ConfigPopover
              title="State loading"
              size="wide"
              illustrationFrame="none"
              service={service}
              isReadonly={isReadonly}
              illustration={
                <StateLoadingIllustration lazy={isLazyState} explanation />
              }
            />
          }
        />
      )}
    </Card>
  );
}
