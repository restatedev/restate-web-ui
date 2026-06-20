import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { SearchField, Input as AriaInput, Label } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';
import { RestateServer } from '@restate/ui/restate-server';
import { useRestateContext } from '@restate/features/restate-context';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui/keyboard';
import {
  formatDurations,
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
  toCompletedInvocationsBucketHref,
  toCompletedInvocationsHref,
  toInFlightInvocationsHref,
} from '@restate/util/invocation-links';
import { useWaveAnimation } from '@restate/ui/wave-animation';
import { Ellipsis, Spinner } from '@restate/ui/loading';
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
  EngineEgressTop,
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
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import {
  CompletionHistoryChart,
  type CompletionBucketOutcome,
} from '@restate/features/completion-history';
import { useCompletedInvocationsTimeline } from '@restate/data-access/admin-api-hooks';
import { useNavigate } from 'react-router';

const LINE_COUNT = 7;
const MINUTE_MS = 60 * 1000;

function formatElapsedBucketLabel(bucket?: { start: string; end: string }) {
  if (!bucket) return undefined;
  const startMs = Date.parse(bucket.start);
  const endMs = Date.parse(bucket.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return undefined;
  const elapsedMs = Math.max(0, Math.min(Date.now(), endMs) - startMs);
  const minutes = Math.max(1, Math.min(60, Math.ceil(elapsedMs / MINUTE_MS)));
  return `Last ${formatDurations({ minutes }, { style: 'short' })}`;
}

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
  base: 'relative -mb-7 aspect-square w-36 shrink-0 overflow-visible @min-[26rem]/hero:w-40 @min-[40rem]/hero:w-[11.25rem] @min-[64rem]/hero:-mb-9 @min-[64rem]/hero:w-[13.2rem]',
});

const gaugeLabelStyles = tv({
  base: 'text-xs text-gray-500',
  variants: {
    textOnly: {
      true: 'text-sm font-medium text-gray-400',
      false: 'mt-1',
    },
  },
});

const summaryStackStyles = tv({
  base: 'relative z-40 col-span-3 col-start-1 row-start-3 flex flex-col items-center @min-[64rem]/hero:col-span-1 @min-[64rem]/hero:col-start-3',
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
  textOnly,
  className,
}: {
  segments: ArcSegment[];
  count: number;
  valueLabel?: string;
  label: ReactNode;
  sublabel?: string;
  href: string;
  isLoading?: boolean;
  isError?: boolean;
  textOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={gaugeStyles({ class: className })}>
      <StatusArcEcharts segments={segments} isLoading={isLoading} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
        {isLoading ? (
          <div className="h-7 w-14 animate-pulse rounded-lg bg-gray-200 sm:h-8" />
        ) : isError ? (
          <span className="text-xl font-semibold text-gray-300">–</span>
        ) : (
          <Link
            href={href}
            variant="icon"
            preserveQueryParams={false}
            className="pointer-events-auto relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 leading-none hover:bg-black/[0.03]"
          >
            {!textOnly && (
              <span className="text-2xl font-semibold text-gray-800 tabular-nums">
                {valueLabel ?? formatNumber(count, true)}
              </span>
            )}
            <span className={gaugeLabelStyles({ textOnly })}>{label}</span>
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
  const navigate = useNavigate();
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
  const isCompletionHistoryEnabled = useIsFeatureFlagEnabled(
    'FEATURE_COMPLETION_HISTORY',
  );
  const { buckets: completionBuckets, isPending: isCompletionLoading } =
    useCompletedInvocationsTimeline({
      refetchInterval: overviewRefetchInterval,
      enabled: isCompletionHistoryEnabled,
    });

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
  // When the completion chart replaces the gauge, the right legend shows the
  // current (live) hour's counts instead of the range totals, still linking to
  // the succeeded/failed invocations via the segment hrefs.
  const currentHourBucket = completionBuckets.at(-1);
  const completedLegendSegments =
    isCompletionHistoryEnabled && currentHourBucket
      ? completedSegments.map((segment) => ({
          ...segment,
          count:
            segment.name === 'succeeded'
              ? currentHourBucket.succeeded
              : currentHourBucket.failed,
          href: toCompletedInvocationsBucketHref(baseUrl, {
            start: currentHourBucket.start,
            end: currentHourBucket.end,
            outcome: segment.name === 'succeeded' ? 'succeeded' : 'failed',
            existingParams: linkParams,
          }),
        }))
      : completedSegments;
  const currentHourCompleted =
    (currentHourBucket?.succeeded ?? 0) + (currentHourBucket?.failed ?? 0);
  const currentHourSuccessRateLabel =
    currentHourCompleted > 0
      ? formatPercentageWithoutFraction(
          (currentHourBucket?.succeeded ?? 0) / currentHourCompleted,
        )
      : undefined;
  const currentHourWindowLabel = formatElapsedBucketLabel(currentHourBucket);
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
  const isSummaryEmpty = !isSummaryLoading && !isSummaryError && allTotal === 0;

  const completedHref = toCompletedInvocationsHref(baseUrl, {
    existingParams: linkParams,
  });
  const onCompletionBucketClick = useCallback(
    (
      bucket: { start: string; end: string },
      outcome: CompletionBucketOutcome,
    ) => {
      navigate(
        toCompletedInvocationsBucketHref(baseUrl, {
          start: bucket.start,
          end: bucket.end,
          outcome,
          existingParams: linkParams,
        }),
      );
    },
    [baseUrl, linkParams, navigate],
  );
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
    isActive:
      inFlightTotal > 0 || metricsState.hasMetricActivity || isAdminMutating,
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
  const renderCompletionSummary = (
    className: string,
    legendClassName = 'min-w-0 place-items-start',
  ) =>
    showHeroLegends ? (
      <div className={className}>
        {isCompletionHistoryEnabled && (
          <span className="px-1.5 text-2xs font-medium tracking-wide text-gray-400 uppercase">
            <Ellipsis>{currentHourWindowLabel}</Ellipsis>
          </span>
        )}
        {isCompletionHistoryEnabled && currentHourSuccessRateLabel && (
          <span className="px-1.5 text-sm font-semibold text-gray-700 tabular-nums">
            {currentHourSuccessRateLabel}
            <span className="ml-1 text-2xs font-normal text-gray-400">
              success rate
            </span>
          </span>
        )}
        <StatusLegend
          items={completedLegendSegments}
          isLoading={
            isSummaryLoading ||
            (isCompletionHistoryEnabled && isCompletionLoading)
          }
          orientation="vertical"
          className={legendClassName}
        />
      </div>
    ) : null;

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
      <div className="relative z-30 grid w-full grid-cols-[minmax(4.75rem,1fr)_auto_minmax(4.75rem,1fr)] items-center justify-center justify-items-center gap-x-2 gap-y-0 px-4 pt-20 @min-[40rem]/hero:pt-8 @min-[64rem]/hero:grid-cols-[minmax(8rem,1fr)_auto_auto_auto_minmax(8rem,1fr)] @min-[64rem]/hero:gap-x-4 @min-[64rem]/hero:pt-16 @min-[76rem]/hero:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_minmax(12rem,1fr)] @min-[108rem]/hero:grid-cols-[minmax(16rem,1fr)_auto_auto_auto_minmax(16rem,1fr)] @min-[108rem]/hero:px-8 @min-[108rem]/hero:pt-20">
        <div className="hidden w-full min-w-0 self-center justify-self-end @min-[64rem]/hero:col-start-1 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:block">
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
          className="col-start-2 row-start-1 @min-[64rem]/hero:col-start-2"
          segments={inFlightSegments}
          count={inFlightTotal}
          label={
            isSummaryEmpty ? (
              'No in-flight'
            ) : inFlightTotal > 0 ? (
              <Ellipsis>In-flight</Ellipsis>
            ) : (
              'In-flight'
            )
          }
          textOnly={isSummaryEmpty}
          href={toInFlightInvocationsHref(baseUrl, {
            existingParams: linkParams,
          })}
          isLoading={isSummaryLoading}
          isError={isSummaryError}
        />
        <EngineCore
          className="pointer-events-auto z-20 hidden @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:flex"
          serverRef={serverRef}
          status={ferrofluidStatus}
          onPress={onRefresh}
          aboveServer={
            <EngineEgressTop
              hasSummaryActivity={allTotal > 0}
              metricsRefetchInterval={overviewRefetchInterval}
              data-overview-refresh-bounce=""
              className="pointer-events-auto mb-1"
            />
          }
        />
        {isCompletionHistoryEnabled ? (
          <>
            {renderCompletionSummary(
              'col-start-2 row-start-2 mt-4 flex w-64 max-w-[calc(100vw-7rem)] min-w-0 flex-col items-center gap-1 self-start justify-self-center text-center @min-[40rem]/hero:w-72 @min-[64rem]/hero:hidden',
              'min-w-0 place-items-center',
            )}
            <CompletionHistoryChart
              buckets={completionBuckets}
              isPending={isCompletionLoading}
              onBucketClick={onCompletionBucketClick}
              className="hidden h-20 w-40 self-start overflow-hidden @min-[26rem]/hero:w-44 @min-[40rem]/hero:w-[12.8rem] @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:block @min-[64rem]/hero:h-32 @min-[64rem]/hero:w-[15.4rem] @min-[64rem]/hero:self-center"
            />
          </>
        ) : (
          <HeroGauge
            className="col-start-2 row-start-2 mt-3 @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:mt-0"
            segments={completedSegments}
            count={completedTotal}
            valueLabel={completedSuccessRateLabel}
            label={isSummaryEmpty ? 'No completed' : completedLabel}
            sublabel={completedSublabel}
            textOnly={isSummaryEmpty}
            href={completedHref}
            isLoading={isSummaryLoading}
            isError={isSummaryError}
          />
        )}
        {renderCompletionSummary(
          'hidden w-full min-w-0 flex-col gap-1 self-center justify-self-start @min-[64rem]/hero:col-start-5 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:flex',
        )}
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
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-2 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        <EngineEgress
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        <CompletedMetrics
          hasSummaryActivity={allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        {!isCompletionHistoryEnabled && (
          <div
            data-overview-refresh-bounce=""
            className={summaryStackStyles({ metricsVisible })}
          >
            <div className="pointer-events-auto flex items-center justify-center gap-2 whitespace-nowrap @max-[30rem]/hero:scale-90">
              {isSummaryLoading ? (
                <span className="h-7 w-48 animate-pulse rounded-xl bg-gray-200" />
              ) : (
                <span className="flex items-baseline gap-1.5">
                  {isSummaryEmpty ? (
                    <span className="text-base font-medium text-gray-400">
                      No invocations
                    </span>
                  ) : (
                    <>
                      <span className="text-lg font-semibold text-gray-700 tabular-nums">
                        {isSummaryError ? '–' : formatNumber(allTotal, true)}
                      </span>
                      <span className="text-base text-gray-500">
                        invocations
                      </span>
                    </>
                  )}
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
          </div>
        )}
      </div>

      <div
        data-overview-refresh-bounce=""
        className="relative z-40 mt-3 -mb-8 flex flex-col items-center"
      >
        <IssuesBannerStack />
        <div className="h-5" />
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
                    : option.value === 'invocations' &&
                        isCompletionHistoryEnabled
                      ? 'In-flight invocations'
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
