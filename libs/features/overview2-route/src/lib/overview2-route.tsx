import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { SearchField, Input as AriaInput, Label } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';
import { RestateServer } from '@restate/ui/restate-server';
import { useRestateContext } from '@restate/features/restate-context';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui/keyboard';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { IssuesBannerStack } from '@restate/ui/issue-banner';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { ErrorBanner } from '@restate/ui/error';
import { Button } from '@restate/ui/button';
import {
  StatusArcEcharts,
  StatusLegend,
  buildCompletedSegments,
  buildInFlightSegments,
  splitInvocationTotals,
  type ArcSegment,
} from '@restate/features/status-chart';
import {
  toCompletedInvocationsHref,
  toInFlightInvocationsHref,
} from '@restate/util/invocation-links';
import { useWaveAnimation } from '@restate/ui/wave-animation';
import { Spinner } from '@restate/ui/loading';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelHeader,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { OverviewProvider, useOverviewContext } from './OverviewContext';
import { useRestateServerStatus } from './useRestateServerStatus';
import { NoDeploymentPlaceholder } from './NoDeploymentPlaceholder';
import { TimeRangeToggle } from './TimeRangeToggle';
import {
  EngineCore,
  InFlightMetrics,
  CompletedMetrics,
  EngineEgress,
  OverviewMetricsRail,
  useMetricsState,
} from './EngineCluster';
import { OVERVIEW_MODE_PARAM } from './overviewMode';
import { SortByDropdown } from './SortByDropdown';
import { DeploymentActions } from './DeploymentActions';
import { ServicesGridList } from './ServicesGridList';
import { DeploymentsGridList } from './DeploymentsGridList';
import { HandlersGridList } from './HandlersGridList';
import { getRangeLabel, useRange } from '@restate/features/restate-context';

const LINE_COUNT = 7;

function usePerspectiveLines(
  containerRef: React.RefObject<HTMLDivElement | null>,
  serverRef: React.RefObject<HTMLDivElement | null>,
  panel: HTMLElement | null,
  enabled: boolean,
) {
  const [lineData, setLineData] = useState({
    paths: [] as string[],
    viewBox: '0 0 1 1',
    fadeStart: 0,
    fadeEnd: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const server = serverRef.current;
    if (!container || !server || !panel) return;

    const update = () => {
      const cRect = container.getBoundingClientRect();
      const sRect = server.getBoundingClientRect();
      const pRect = panel.getBoundingClientRect();

      const w = cRect.width;
      const h = cRect.height;
      if (w === 0 || h === 0) return;

      const serverCenterX = sRect.left + sRect.width / 2 - cRect.left;
      const startY = sRect.bottom - cRect.top;
      const startSpread = sRect.width / 4;
      const endY = pRect.top - cRect.top;
      const panelCenter = pRect.left + pRect.width / 2 - cRect.left;
      const endSpread = pRect.width * 0.35;

      const paths: string[] = [];
      for (let i = 0; i < LINE_COUNT; i++) {
        const t = (i - (LINE_COUNT - 1) / 2) / ((LINE_COUNT - 1) / 2);
        const topX = serverCenterX + t * startSpread;
        const bottomX = panelCenter + t * endSpread;
        const verticalEnd = startY + (endY - startY) * 0.1;
        const cpY1 = verticalEnd + (endY - verticalEnd) * 0.35;
        const cpY2 = verticalEnd + (endY - verticalEnd) * 0.75;
        paths.push(
          `M${topX},${startY} L${topX},${verticalEnd} C${topX},${cpY1} ${bottomX},${cpY2} ${bottomX},${endY} L${bottomX},${h}`,
        );
      }
      setLineData({
        paths,
        viewBox: `0 0 ${w} ${h}`,
        fadeStart: endY,
        fadeEnd: endY + 24,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [containerRef, serverRef, panel, enabled]);

  return lineData;
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
        [{ opacity: 0 }, { opacity: 0.2, offset: 0.15 }, { opacity: 0 }],
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
  paths,
  viewBox,
  fadeStart,
  fadeEnd,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  paths: string[];
  viewBox: string;
  fadeStart: number;
  fadeEnd: number;
}) {
  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-[25] hidden h-full w-full text-slate-400 @min-[64rem]/hero:block"
      viewBox={viewBox}
      fill="none"
    >
      <defs>
        <linearGradient
          id="perspective-fade"
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={fadeStart}
          x2={0}
          y2={fadeEnd}
        >
          <stop offset="0" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="url(#perspective-fade)"
          strokeWidth="1.5"
          opacity="0"
        />
      ))}
    </svg>
  );
}

const emptyServerStyles = tv({
  base: 'flex w-full flex-auto flex-col items-center justify-center overflow-hidden rounded-xl border bg-gray-200/50 pt-24 pb-8 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] ring-1 ring-white/80 @tall:pt-10 @tall:pb-40',
  variants: {
    isError: {
      true: '[&>svg:first-child>path]:fill-red-100',
      false: '',
    },
  },
});

function TabCount({
  count,
  isLoading,
}: {
  count: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <span className="ml-1 inline-block h-3 w-5 animate-pulse rounded bg-zinc-200" />
    );
  }
  return (
    <span className="ml-1 rounded bg-zinc-100 px-1 py-px text-2xs font-medium text-zinc-500 tabular-nums">
      {formatNumber(count, true)}
    </span>
  );
}

const gaugeStyles = tv({
  base: 'relative -mb-9 aspect-square w-40 shrink-0 overflow-visible @min-[26rem]/hero:w-44 @min-[40rem]/hero:w-[12.8rem] @min-[64rem]/hero:-mb-11 @min-[64rem]/hero:w-[15.4rem]',
});

const summaryStackStyles = tv({
  base: 'relative z-40 col-span-3 col-start-1 row-start-3 flex flex-col items-center @min-[64rem]/hero:col-span-1 @min-[64rem]/hero:col-start-2 @min-[76rem]/hero:col-start-3',
  variants: {
    metricsVisible: {
      true: 'mt-4 @min-[64rem]/hero:mt-7',
      false: 'mt-1 @min-[64rem]/hero:mt-2',
    },
  },
});

function HeroGauge({
  segments,
  count,
  valueLabel,
  label,
  sublabel,
  href,
  isLoading,
  isError,
  className,
}: {
  segments: ArcSegment[];
  count: number;
  valueLabel?: string;
  label: string;
  sublabel?: string;
  href: string;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}) {
  return (
    <div className={gaugeStyles({ class: className })}>
      <StatusArcEcharts segments={segments} isLoading={isLoading} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
        {isLoading ? (
          <div className="h-7 w-14 animate-pulse rounded-lg bg-gray-200 sm:h-8" />
        ) : isError ? (
          <span className="text-2xl font-semibold text-gray-300">–</span>
        ) : (
          <Link
            href={href}
            variant="icon"
            preserveQueryParams={false}
            className="pointer-events-auto relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 leading-none hover:bg-black/[0.03]"
          >
            <span className="text-2xl font-semibold text-gray-800 tabular-nums sm:text-3xl">
              {valueLabel ?? formatNumber(count, true)}
            </span>
            <span className="mt-1 text-xs text-gray-500 sm:text-sm">
              {label}
            </span>
            {sublabel && (
              <span className="absolute top-full left-1/2 mt-0 hidden -translate-x-1/2 text-2xs whitespace-nowrap text-gray-400 tabular-nums @min-[40rem]/hero:block">
                {sublabel}
              </span>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

function OverviewContent() {
  const {
    servicesMap,
    deploymentsMap,
    byStatus,
    totalCount,
    serviceIssuesMap,
    isSummaryLoading,
    isSummaryError,
    summaryError,
    summaryQueryKey,
    isInitialLoading,
    isBare,
    isEmpty,
    isError,
    error,
    isDeploymentsFetching,
    linkParams,
    mode,
    filter,
    setFilter,
    triggerManualRefresh,
    overviewRefetchInterval,
  } = useOverviewContext();
  const servicesCount = servicesMap?.size ?? 0;
  const deploymentsCount = deploymentsMap?.size ?? 0;
  const handlersCount = Array.from(servicesMap?.values() ?? []).reduce(
    (sum, s) => sum + s.handlers.length,
    0,
  );

  const { GettingStarted, status, baseUrl } = useRestateContext();

  const adminQueryPredicate = {
    predicate(query: { meta?: Record<string, unknown> }) {
      return Boolean(query.meta?.isAdmin);
    },
  };
  const isAdminMutating = useIsMutating(adminQueryPredicate) > 0;
  const metricsState = useMetricsState(overviewRefetchInterval);
  const queryClient = useQueryClient();
  const range = useRange();
  const rangeLabel = getRangeLabel(range);

  const {
    total: allTotal,
    inFlight: inFlightTotal,
    succeeded,
    failed,
  } = splitInvocationTotals(byStatus);
  const completedSegments = useMemo(
    () => buildCompletedSegments(byStatus, baseUrl, linkParams),
    [byStatus, baseUrl, linkParams],
  );
  const completedTotal = succeeded + failed;
  const completedSuccessRate =
    completedTotal > 0 ? succeeded / completedTotal : 0;
  const completedSuccessRateLabel =
    completedTotal > 0
      ? formatPercentageWithoutFraction(completedSuccessRate)
      : undefined;
  const completedLabel = completedTotal > 0 ? 'Succeeded' : 'Completed';
  const completedSublabel =
    completedTotal > 0
      ? `of ${formatNumber(completedTotal, true)} completed`
      : undefined;

  const completedHref = toCompletedInvocationsHref(baseUrl, {
    existingParams: linkParams,
  });
  const inFlightSegments = useMemo(
    () => buildInFlightSegments(byStatus, baseUrl, linkParams),
    [byStatus, baseUrl, linkParams],
  );
  const metricsVisible =
    metricsState.isMetricsEnabled &&
    metricsState.hasLoadedMetrics &&
    (allTotal > 0 || metricsState.hasMetricActivity);

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
    isError: isError || isSummaryError,
    isActive: metricsState.hasMetricActivity || isAdminMutating,
    issueSeverity: overallIssueSeverity,
  });

  const filterRef = useFocusShortcut<HTMLInputElement>();

  const { triggerWave } = useWaveAnimation();
  const serverRef = useRef<HTMLDivElement>(null);
  const linesSvgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const heroReady = !isInitialLoading && !isBare && !isEmpty;
  const { paths, viewBox, fadeStart, fadeEnd } = usePerspectiveLines(
    containerRef,
    serverRef,
    panelEl,
    heroReady,
  );
  const triggerRay = usePerspectiveRay(linesSvgRef);
  const showHeroLegends =
    isSummaryLoading || (!isSummaryError && totalCount > 0);
  const filterPlaceholder =
    mode === 'services'
      ? 'Filter services, handlers, or deployments…'
      : mode === 'deployments'
        ? 'Filter deployments or services…'
        : 'Filter handlers, services, or types…';

  const onRefresh = () => {
    serverRef.current?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.04)' },
        { transform: 'scale(1)' },
      ],
      { duration: 500, easing: 'ease-in-out' },
    );
    triggerRay();
    triggerWave(serverRef, 'overview-card');
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[data-overview-refresh-bounce]')
      .forEach((el) => {
        el.animate(
          [
            { transform: 'translateY(0)' },
            { transform: 'translateY(-3px)' },
            { transform: 'translateY(0)' },
          ],
          { duration: 400, easing: 'ease-in-out' },
        );
      });
    triggerManualRefresh();
  };

  if (isInitialLoading) {
    return (
      <div className="flex min-h-full translate-y-10 flex-col justify-end px-8 py-6">
        <p className="flex items-center gap-2">
          <Spinner />
          Loading...
        </p>
      </div>
    );
  }

  if (isBare) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <RestateServer status={ferrofluidStatus} isEmpty onPress={onRefresh}>
          {isError && !isDeploymentsFetching && (
            <div className="relative mt-6 flex w-full flex-col items-center gap-2">
              <ErrorBanner error={error} />
            </div>
          )}
        </RestateServer>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <RestateServer
          className={emptyServerStyles({ isError: false })}
          status={ferrofluidStatus}
          appearance="solid"
          isEmpty
          onPress={onRefresh}
        >
          <NoDeploymentPlaceholder
            error={isError ? error : null}
            isRefreshing={isDeploymentsFetching}
          />
          {GettingStarted && <GettingStarted className="hidden @tall:block" />}
        </RestateServer>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="@container/hero relative mx-auto flex min-h-0 w-full flex-1 flex-col items-center gap-0"
    >
      <PerspectiveLines
        svgRef={linesSvgRef}
        paths={paths}
        viewBox={viewBox}
        fadeStart={fadeStart}
        fadeEnd={fadeEnd}
      />
      <div className="relative z-30 grid w-full max-w-[112rem] grid-cols-[minmax(4.75rem,1fr)_auto_minmax(4.75rem,1fr)] items-center justify-center justify-items-center gap-x-2 gap-y-0 pt-20 @min-[40rem]/hero:pt-8 @min-[64rem]/hero:grid-cols-[auto_minmax(29rem,auto)_auto] @min-[64rem]/hero:gap-x-4 @min-[64rem]/hero:pt-16 @min-[76rem]/hero:grid-cols-[minmax(5.5rem,8rem)_auto_minmax(29rem,auto)_auto_minmax(5.5rem,8rem)] @min-[108rem]/hero:grid-cols-[minmax(16rem,1fr)_auto_minmax(37rem,auto)_auto_minmax(16rem,1fr)] @min-[108rem]/hero:pt-20">
        <div className="hidden w-full max-w-[10rem] min-w-0 self-center justify-self-end @min-[76rem]/hero:col-start-1 @min-[76rem]/hero:row-start-1 @min-[76rem]/hero:block @min-[108rem]/hero:max-w-none">
          {showHeroLegends && (
            <StatusLegend
              items={inFlightSegments}
              isLoading={isSummaryLoading}
              orientation="vertical"
              className="w-full min-w-0 justify-items-end"
            />
          )}
        </div>
        <HeroGauge
          className="col-start-2 row-start-1 @min-[64rem]/hero:col-start-1 @min-[76rem]/hero:col-start-2"
          segments={inFlightSegments}
          count={inFlightTotal}
          label="In-flight"
          href={toInFlightInvocationsHref(baseUrl, {
            existingParams: linkParams,
          })}
          isLoading={isSummaryLoading}
          isError={isSummaryError}
        />
        <EngineCore
          className="pointer-events-auto z-20 hidden @min-[64rem]/hero:col-start-2 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:block @min-[76rem]/hero:col-start-3"
          serverRef={serverRef}
          status={ferrofluidStatus}
          onPress={onRefresh}
        />
        <HeroGauge
          className="col-start-2 row-start-2 mt-3 @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:mt-0 @min-[76rem]/hero:col-start-4"
          segments={completedSegments}
          count={completedTotal}
          valueLabel={completedSuccessRateLabel}
          label={completedLabel}
          sublabel={completedSublabel}
          href={completedHref}
          isLoading={isSummaryLoading}
          isError={isSummaryError}
        />
        <div className="hidden w-full max-w-[10rem] min-w-0 self-center justify-self-start @min-[76rem]/hero:col-start-5 @min-[76rem]/hero:row-start-1 @min-[76rem]/hero:block @min-[108rem]/hero:max-w-none">
          {showHeroLegends && (
            <StatusLegend
              items={completedSegments}
              isLoading={isSummaryLoading}
              orientation="vertical"
              className="w-full min-w-0"
            />
          )}
        </div>
        <OverviewMetricsRail
          side="left"
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="col-start-1 row-span-2 row-start-1 self-center justify-self-end @min-[64rem]/hero:hidden"
        />
        <OverviewMetricsRail
          side="right"
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="col-start-3 row-span-2 row-start-1 self-center justify-self-start @min-[64rem]/hero:hidden"
        />
        <InFlightMetrics
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-1 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex @min-[76rem]/hero:col-start-2"
        />
        <EngineEgress
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden w-[29rem] self-start @min-[64rem]/hero:col-start-2 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex @min-[76rem]/hero:col-start-3 @min-[108rem]/hero:w-[37rem]"
        />
        <CompletedMetrics
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex @min-[76rem]/hero:col-start-4"
        />
        <div
          data-overview-refresh-bounce=""
          className={summaryStackStyles({ metricsVisible })}
        >
          <div className="pointer-events-auto flex items-center justify-center gap-2 whitespace-nowrap @max-[30rem]/hero:scale-90">
            {isSummaryLoading ? (
              <span className="h-7 w-48 animate-pulse rounded-xl bg-gray-200" />
            ) : (
              <span className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-gray-700 tabular-nums">
                  {isSummaryError ? '–' : formatNumber(allTotal, true)}
                </span>
                <span className="text-base text-gray-500">invocations</span>
              </span>
            )}
            <TimeRangeToggle
              onChange={() => {
                queryClient.cancelQueries({
                  queryKey: summaryQueryKey,
                  exact: true,
                });
              }}
            />
            {summaryError && (
              <Popover>
                <PopoverTrigger>
                  <Button
                    aria-label="Could not load invocation data"
                    variant="secondary"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-red-200/80 bg-red-50/90 p-0 text-red-600 shadow-none hover:bg-red-100/90"
                  >
                    <Icon
                      name={IconName.TriangleAlert}
                      className="h-4 w-4 fill-red-200 text-red-600"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm">
                  <ErrorBanner error={summaryError} className="rounded-xl" />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="relative mt-3 -mb-8 flex flex-col items-center">
            <IssuesBannerStack />
            <div className="h-5" />
          </div>
        </div>
      </div>

      <ContentPanel
        className="z-20 w-full"
        tabs={{
          queryParam: OVERVIEW_MODE_PARAM,
          defaultId: 'services',
          items: [
            {
              id: 'services',
              label: (
                <div className="flex items-center gap-2">
                  <Icon name={IconName.Box} className="h-3.5 w-3.5" />
                  Services
                  <TabCount
                    count={servicesCount}
                    isLoading={isDeploymentsFetching}
                  />
                </div>
              ),
            },
            {
              id: 'deployments',
              label: (
                <div className="flex items-center gap-2">
                  <Icon name={IconName.Http} className="h-3.5 w-3.5" />
                  Deployments
                  <TabCount
                    count={deploymentsCount}
                    isLoading={isDeploymentsFetching}
                  />
                </div>
              ),
            },
            {
              id: 'handlers',
              label: (
                <div className="flex items-center gap-2">
                  <Icon
                    name={IconName.Function}
                    className="-mx-1.5 h-5.5 w-5.5"
                  />
                  Handlers
                  <TabCount
                    count={handlersCount}
                    isLoading={isDeploymentsFetching}
                  />
                </div>
              ),
            },
          ],
        }}
      >
        <ContentPanelToolbar className="">
          <DeploymentActions />
        </ContentPanelToolbar>
        <ContentPanelHeader className="px-2 py-1.5">
          <div
            ref={setPanelEl}
            className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SortByDropdown
                formatServiceSortLabel={(option) =>
                  option.value === 'health'
                    ? `${option.label} ${rangeLabel}`
                    : option.label
                }
              />
            </div>
            <SearchField
              aria-label="Filter"
              value={filter}
              onChange={setFilter}
              className="min-w-0 flex-auto outline-none lg:grow-0 lg:basis-[38ch]"
            >
              <Label className="sr-only">{filterPlaceholder}</Label>
              <div className="relative min-h-7">
                <AriaInput
                  ref={filterRef}
                  placeholder={filterPlaceholder}
                  className="mt-0 w-full min-w-0 rounded-xl border border-black/10 bg-white px-2 py-1 pr-8 pl-8 text-sm text-gray-800 shadow-xs outline-offset-2 placeholder:text-gray-500/70 focus:ring-0 focus:outline-2 focus:outline-blue-600"
                />
                <Icon
                  name={IconName.Search}
                  className="pointer-events-none absolute top-0 bottom-0 left-2 aspect-square h-full p-1 text-gray-400"
                />
                <FocusShortcutKey
                  variant="light"
                  className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
                />
              </div>
            </SearchField>
          </div>
        </ContentPanelHeader>
        <ContentPanelBody className="pb-20">
          <ContentPanelSection>
            <div className="pt-2">
              {isError && !isDeploymentsFetching && error && (
                <ErrorBanner error={error} className="mx-2 mb-3 rounded-xl" />
              )}
              {mode === 'services' ? (
                <ServicesGridList />
              ) : mode === 'deployments' ? (
                <DeploymentsGridList />
              ) : (
                <HandlersGridList />
              )}
            </div>
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
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
