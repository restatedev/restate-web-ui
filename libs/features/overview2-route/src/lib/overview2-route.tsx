import { useRef, useCallback } from 'react';
import { SearchField, Input as AriaInput, Label } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from '@restate/features/service';
import { Link } from '@restate/ui/link';
import { RestateServer } from '@restate/ui/restate-server';
import { useRestateContext } from '@restate/features/restate-context';
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query';
import { isOverviewRefreshQuery } from '@restate/data-access/admin-api';
import { TriggerRegisterDeploymentDialog } from '@restate/features/register-deployment';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui/keyboard';
import { formatNumber } from '@restate/util/intl';
import { IssuesBannerStack } from '@restate/ui/issue-banner';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { ErrorBanner } from '@restate/ui/error';
import { Button } from '@restate/ui/button';
import { StatusArcEcharts, StatusLegend } from '@restate/features/status-chart';
import { useWaveAnimation } from '@restate/ui/wave-animation';
import {
  OverviewProvider,
  useOverviewContext,
} from './OverviewContext';
import { useRestateServerStatus } from './useRestateServerStatus';
import { NoDeploymentPlaceholder } from './NoDeploymentPlaceholder';
import { TimeRangeToggle } from './TimeRangeToggle';
import { OverviewModeToggle } from './OverviewModeToggle';
import { ServicesGridList } from './ServicesGridList';
import { DeploymentsGridList } from './DeploymentsGridList';

const LINE_COUNT = 9;
const TOP_SPACING = 10;
const BOTTOM_SPACING = 100;
const CURVE_Y1 = 150;
const CURVE_Y2 = 290;

function buildLinePath(i: number) {
  const t = (i - (LINE_COUNT - 1) / 2) / ((LINE_COUNT - 1) / 2);
  const topX = 500 + t * TOP_SPACING * ((LINE_COUNT - 1) / 2);
  const bottomX = 500 + t * BOTTOM_SPACING * ((LINE_COUNT - 1) / 2);
  const cp1Y = CURVE_Y1 + (CURVE_Y2 - CURVE_Y1) * 0.7;
  const cp2Y = CURVE_Y1 + (CURVE_Y2 - CURVE_Y1) * 0.8;
  return `M${topX},80 L${topX},${CURVE_Y1} C${topX},${cp1Y} ${bottomX},${cp2Y} ${bottomX},${CURVE_Y2} L${bottomX},800`;
}

function usePerspectiveRay(svgRef: React.RefObject<SVGSVGElement | null>) {
  return useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, i) => {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      path.animate(
        [{ opacity: 0 }, { opacity: 0.1, offset: 0.15 }, { opacity: 0 }],
        {
          duration: 800,
          delay: Math.abs(i - (LINE_COUNT - 1) / 2) * 50,
          easing: 'ease-out',
          fill: 'forwards',
        },
      );
    });
  }, [svgRef]);
}

function PerspectiveLines({
  svgRef,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full w-full text-indigo-400"
      preserveAspectRatio="none"
      viewBox="0 0 1000 800"
      fill="none"
    >
      {Array.from({ length: LINE_COUNT }, (_, i) => (
        <path
          key={i}
          d={buildLinePath(i)}
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0"
        />
      ))}
    </svg>
  );
}

const emptyServerStyles = tv({
  base: 'flex w-full flex-auto flex-col items-center justify-center overflow-hidden rounded-xl border bg-gray-200/50 pt-24 pb-8 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] @tall:pt-10 @tall:pb-40',
  variants: {
    isError: {
      true: '[&>svg:first-child>path]:fill-red-100',
      false: '',
    },
  },
});

function OverviewContent() {
  const {
    servicesMap,
    byStatus,
    totalCount,
    serviceIssuesMap,
    isSummaryLoading,
    isSummaryError,
    summaryError,
    summaryQueryKey,
    isEmpty,
    isError,
    error,
    linkParams,
    mode,
    filter,
    setFilter,
  } = useOverviewContext();

  const { GettingStarted, status } = useRestateContext();

  const adminQueryPredicate = {
    predicate(query: { meta?: Record<string, unknown> }) {
      return Boolean(query.meta?.isAdmin);
    },
  };
  const isAdminFetching = useIsFetching(adminQueryPredicate) > 0;
  const isAdminMutating = useIsMutating(adminQueryPredicate) > 0;
  const queryClient = useQueryClient();

  let overallIssueSeverity: 'high' | 'low' | 'none' = 'none';
  for (const issues of serviceIssuesMap.values()) {
    if (issues.some((i) => i.severity === 'high')) {
      overallIssueSeverity = 'high';
      break;
    }
    overallIssueSeverity = 'low';
  }

  const ferrofluidStatus = useRestateServerStatus({
    isHealthy: status === 'HEALTHY',
    isError,
    isActive: isAdminFetching || isAdminMutating,
    issueSeverity: overallIssueSeverity,
  });

  const filterRef = useFocusShortcut<HTMLInputElement>();

  const { triggerWave } = useWaveAnimation();
  const serverRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const issuesRef = useRef<HTMLDivElement>(null);
  const linesSvgRef = useRef<SVGSVGElement>(null);
  const triggerRay = usePerspectiveRay(linesSvgRef);
  const noInvocations =
    !isSummaryLoading && !isSummaryError && totalCount === 0;
  const firstServiceName = servicesMap?.values().next().value?.name;
  const filterPlaceholder =
    mode === 'services'
      ? 'Filter services, handlers, or deployments…'
      : 'Filter deployments or services…';

  const onRefresh = () => {
    pieRef.current?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.03)' },
        { transform: 'scale(1)' },
      ],
      { duration: 500, easing: 'ease-in-out' },
    );
    triggerRay();
    triggerWave(serverRef, '[data-wave-card]');
    issuesRef.current?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-3px)' },
        { transform: 'translateY(0)' },
      ],
      { duration: 400, easing: 'ease-in-out' },
    );
    queryClient.refetchQueries(
      {
        type: 'active',
        predicate: isOverviewRefreshQuery,
      },
      {
        cancelRefetch: true,
      },
    );
  };

  if (isEmpty) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <RestateServer
          className={emptyServerStyles({ isError })}
          status={ferrofluidStatus}
          isEmpty
          onPress={onRefresh}
        >
          <NoDeploymentPlaceholder error={error} />
          {GettingStarted && <GettingStarted className="hidden @tall:block" />}
        </RestateServer>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full flex-col items-center gap-8 px-6 pt-8 pb-6">
      <PerspectiveLines svgRef={linesSvgRef} />
      <div className="relative flex flex-col items-center gap-3">
        <div
          ref={pieRef}
          className="relative -mb-12 h-[280px] w-[280px] overflow-visible"
        >
          <StatusArcEcharts
            byStatus={byStatus}
            isLoading={isSummaryLoading}
            linkParams={linkParams}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              ref={serverRef}
              className="pointer-events-auto z-20 scale-90 filter-[drop-shadow(0_4px_12px_rgba(0,0,0,0.08))_drop-shadow(0_1px_3px_rgba(0,0,0,0.06))]"
            >
              <RestateServer
                status={ferrofluidStatus}
                onPress={onRefresh}
                aura={noInvocations ? 'prominent' : 'subtle'}
              />
            </div>
          </div>
        </div>
        <TimeRangeToggle
          onChange={() => {
            queryClient.cancelQueries({
              queryKey: summaryQueryKey,
              exact: true,
            });
          }}
        />
        <div className="flex min-h-14 items-center justify-center gap-1.5">
          {summaryError ? (
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-lg border-orange-200/80 bg-orange-50/80 px-3 py-1.5 text-xs text-orange-600 shadow-none hover:bg-orange-100/80"
                >
                  <Icon
                    name={IconName.TriangleAlert}
                    className="h-3.5 w-3.5 fill-orange-200 text-orange-500"
                  />
                  Could not load invocation data
                  <Icon
                    name={IconName.ChevronsUpDown}
                    className="h-3 w-3 text-orange-400"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-sm">
                <ErrorBanner error={summaryError} className="rounded-xl" />
              </PopoverContent>
            </Popover>
          ) : isSummaryLoading ? (
            <>
              <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200" />
            </>
          ) : noInvocations ? (
            <div className="flex flex-col items-center gap-1 pt-2 text-center">
              <p className="text-lg font-medium text-gray-600">All quiet</p>
              <p className="flex items-center gap-1 text-sm text-gray-400">
                <Link
                  {...(firstServiceName && {
                    href: `?${SERVICE_PLAYGROUND_QUERY_PARAM}=${firstServiceName}`,
                  })}
                  variant="icon"
                  className="-mb-3 flex items-center gap-1.5 rounded-xl text-gray-500/80"
                >
                  No invocations yet —{' '}
                  <span className="font-medium underline">try sending one</span>
                </Link>
              </p>
            </div>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-700 tabular-nums">
                {formatNumber(totalCount, true)}
              </span>
              <span className="text-sm text-gray-400">
                {totalCount === 1 ? 'invocation' : 'invocations'}
              </span>
            </>
          )}
        </div>
        {totalCount > 0 && (
          <StatusLegend
            byStatus={byStatus}
            isLoading={isSummaryLoading}
            isError={isSummaryError}
            linkParams={linkParams}
          />
        )}
      </div>
      <div ref={issuesRef}>
        <IssuesBannerStack className="-mt-4" />
      </div>

      <div className="mt-8 flex min-h-0 w-full flex-1 flex-col">
        <div className="mb-2 flex flex-col gap-2 px-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <SearchField
              aria-label="Filter"
              value={filter}
              onChange={setFilter}
              className="w-full outline-none md:max-w-[30ch] md:min-w-[30ch]"
            >
              <Label className="sr-only">{filterPlaceholder}</Label>
              <div className="relative min-h-8.5">
                <AriaInput
                  ref={filterRef}
                  placeholder={filterPlaceholder}
                  className="mt-0 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 pr-8 pl-8 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline-2 focus:outline-blue-600"
                />
                <Icon
                  name={IconName.Search}
                  className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <FocusShortcutKey
                  variant="light"
                  className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
                />
              </div>
            </SearchField>
            <OverviewModeToggle />
          </div>
          <TriggerRegisterDeploymentDialog className="mr-1.5 justify-center py-1.5 md:ml-auto md:justify-normal" />
        </div>
        {mode === 'services' ? (
          <ServicesGridList />
        ) : (
          <DeploymentsGridList />
        )}
      </div>
    </div>
  );
}

function Component() {
  return (
    <OverviewProvider>
      <OverviewContent />
    </OverviewProvider>
  );
}

export const overview2 = { Component };
