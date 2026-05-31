import type { Service, components } from '@restate/data-access/admin-api-spec';
import { cx, tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { panelHref } from '@restate/util/panel';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { formatPlurals } from '@restate/util/intl';
import { IssueBadge } from '@restate/ui/issue-banner';
import { toServiceInvocationsHref } from '@restate/util/invocation-links';
import {
  InvocationCountLink,
  ServiceBreakdownTooltip,
  HandlerGridList,
} from '@restate/features/service';
import {
  LatestRevisionDeployment,
  AllRevisions,
} from '@restate/features/deployment';
import {
  buildStatusEntries,
  ServiceStatusBar,
} from '@restate/features/status-chart';
import {
  getRangeLabel,
  useRestateContext,
} from '@restate/features/restate-context';
import { useOnboarding } from '@restate/util/feature-flag';
import type { ServiceIssue } from '@restate/features/system-health';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import {
  cardContainerStyles,
  cardInnerStyles,
  type IssueSeverity,
} from './cardShell';

const layoutStyles = tv({
  base: cx(
    'grid grid-cols-[auto_minmax(0,1fr)_13rem] items-center gap-x-3 gap-y-3',
    "[grid-template-areas:'icon_primary_dropdown'_'deployment_deployment_chart']",
    '@min-[85rem]:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_13rem_9rem]',
    "@min-[85rem]:[grid-template-areas:'icon_primary_deployment_chart_dropdown']",
  ),
});

const iconCellStyles = tv({
  base: '[grid-area:icon]',
});

const primaryCellStyles = tv({
  base: 'flex min-w-0 items-center gap-2 [grid-area:primary]',
});

const deploymentCellStyles = tv({
  base: 'flex min-w-0 items-center gap-2 [grid-area:deployment]',
});

const chartCellStyles = tv({
  base: 'flex min-w-0 items-center gap-3 [grid-area:chart]',
});

const dropdownCellStyles = tv({
  base: 'flex items-center justify-end [grid-area:dropdown]',
});

const playButtonStyles = tv({
  base: 'relative shrink-0 border-none bg-gray-50 px-1 py-1 align-middle shadow-none',
  variants: {
    isOnboarding: {
      true: 'animate-pulseButton bg-blue-50',
      false: '',
    },
  },
});

const playIconStyles = tv({
  base: 'ml-px h-3 w-3 text-blue-700/0',
  variants: {
    isOnboarding: {
      true: 'fill-blue-500',
      false: 'fill-blue-300',
    },
  },
});

export function ServiceCard({
  service,
  summaryData,
  byServiceAndStatus,
  baseUrl,
  serviceIssues,
  isSummaryError,
  isSummaryLoading,
  isDeploymentsFetching,
  linkParams,
  isFocusVisible,
  isHovered,
  isPressed,
  issueSeverity,
}: {
  service: Service;
  summaryData?: components['schemas']['InvocationsSummaryResponse'];
  byServiceAndStatus: { service: string; status: string; count: number }[];
  baseUrl: string;
  serviceIssues: ServiceIssue[];
  isSummaryError: boolean;
  isSummaryLoading: boolean;
  isDeploymentsFetching: boolean;
  linkParams?: URLSearchParams;
  isFocusVisible?: boolean;
  isHovered?: boolean;
  isPressed?: boolean;
  issueSeverity?: IssueSeverity;
}) {
  const { OnboardingGuide } = useRestateContext();
  const isOnboarding = useOnboarding();
  const serviceStatuses = byServiceAndStatus.filter(
    (st) => st.service === service.name && st.count > 0,
  );
  const serviceTotal = serviceStatuses.reduce((sum, st) => sum + st.count, 0);
  const breakdownStatuses = buildStatusEntries(serviceStatuses);
  const breakdownTotal = breakdownStatuses.reduce(
    (sum, st) => sum + st.count,
    0,
  );

  return (
    <div className="px-2">
      <div
        className={cardContainerStyles({ isFocusVisible })}
        {...waveAnimationProps('overview-card')}
      >
        <div
          className={cardInnerStyles({ issueSeverity, isHovered, isPressed })}
        >
          <div className={layoutStyles()}>
            <div className={iconCellStyles()}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-blue-50 p-1 text-blue-400 drop-shadow-md"
                />
              </div>
            </div>
            <div className={primaryCellStyles()}>
              {isDeploymentsFetching ? (
                <div className="h-6 w-32 min-w-0 animate-pulse rounded-lg bg-gray-200/50" />
              ) : (
                <span className="min-w-0 truncate text-[0.92675rem] leading-7 font-medium text-zinc-700">
                  {service.name}
                </span>
              )}
              <PlayButton
                serviceName={service.name}
                handler={
                  service.handlers.length === 1
                    ? service.handlers[0]?.name
                    : undefined
                }
                isOnboarding={isOnboarding}
                OnboardingGuide={OnboardingGuide}
              />
              {serviceIssues.length > 0 && (
                <IssueBadge
                  issues={serviceIssues}
                  serviceName={service.name}
                  baseUrl={baseUrl}
                />
              )}
            </div>

            <div className={deploymentCellStyles()}>
              <LatestRevisionDeployment serviceName={service.name} />
              <AllRevisions serviceName={service.name} />
            </div>

            <div className={chartCellStyles()}>
              <div className="min-w-[6ch] text-right">
                <InvocationCountLink
                  href={toServiceInvocationsHref(baseUrl, service.name, {
                    existingParams: linkParams,
                  })}
                  count={serviceTotal}
                  isLoading={isSummaryLoading}
                  isError={isSummaryError}
                  size="sm"
                  variant="minimal"
                  breakdownTooltip={
                    breakdownTotal > 0 ? (
                      <ServiceBreakdownTooltip
                        serviceName={service.name}
                        statuses={breakdownStatuses}
                        total={breakdownTotal}
                        rangeLabel={getRangeLabel(summaryData?.range)}
                        linkParams={linkParams}
                        serviceIssues={serviceIssues}
                      />
                    ) : undefined
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <ServiceStatusBar
                  serviceName={service.name}
                  data={summaryData}
                  serviceIssues={serviceIssues}
                  isLoading={isSummaryLoading}
                  linkParams={linkParams}
                />
              </div>
            </div>

            <div className={dropdownCellStyles()}>
              <HandlersDropdown service={service} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayButton({
  serviceName,
  handler,
  isOnboarding,
  OnboardingGuide,
}: {
  serviceName: string;
  handler?: string;
  isOnboarding: boolean;
  OnboardingGuide: ReturnType<typeof useRestateContext>['OnboardingGuide'];
}) {
  const button = (
    <HoverTooltip content="Playground" disabled={isOnboarding}>
      <Link
        href={panelHref({ playground: serviceName, handler })}
        variant="secondary-button"
        className={playButtonStyles({ isOnboarding })}
        autoFocus={isOnboarding}
      >
        <Icon
          name={IconName.Play}
          className={playIconStyles({ isOnboarding })}
        />
      </Link>
    </HoverTooltip>
  );

  if (!OnboardingGuide) {
    return button;
  }

  // The guide wraps the button and anchors a tooltip to it, so it tracks the
  // button wherever it lands (no dependence on the service name or layout).
  return (
    <OnboardingGuide stage="open-playground" service={serviceName}>
      {button}
    </OnboardingGuide>
  );
}

function HandlersDropdown({ service }: { service: Service }) {
  const handlers = service.handlers;
  if (handlers.length === 0) {
    return <span className="text-0.5xs text-zinc-400">No handlers</span>;
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="relative inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs font-medium tabular-nums"
        >
          <Icon
            name={IconName.Function}
            className="-mr-1 h-5 w-5 text-zinc-500/80"
          />
          {handlers.length}{' '}
          <span className="opacity-80">
            {formatPlurals(handlers.length, {
              one: 'handler',
              other: 'handlers',
            })}
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-gray-400"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Handlers">
          <HandlerGridList
            serviceName={service.name}
            handlers={handlers}
            serviceType={service.ty}
          />
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
