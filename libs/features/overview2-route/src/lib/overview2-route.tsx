import { useRef, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SearchField, Input as AriaInput, Label } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';
import { RestateServer } from '@restate/ui/restate-server';
import { useRestateContext } from '@restate/features/restate-context';
import { PruneDrainedDeploymentsDialog } from '@restate/features/prune-deployments';
import { useIsMutating } from '@tanstack/react-query';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui/keyboard';
import { formatNumber } from '@restate/util/intl';
import { IssuesBannerStack } from '@restate/ui/issue-banner';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { ErrorBanner } from '@restate/ui/error';
import { Button } from '@restate/ui/button';
import {
  StatusArcEcharts,
  StatusLegend,
  BreakdownMode,
  ChartContextValue,
  type ArcSegment,
} from '@restate/features/status-chart';
import { useWaveAnimation } from '@restate/ui/wave-animation';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { OverviewProvider, useOverviewContext } from './OverviewContext';
import { ErrorPopoverPill } from './ErrorPopoverPill';
import { useRestateServerStatus } from './useRestateServerStatus';
import { NoDeploymentPlaceholder } from './NoDeploymentPlaceholder';
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
import { DeploymentActions } from './DeploymentActions';
import { ServicesTable } from './ServicesTable';
import { DeploymentsTable } from './DeploymentsTable';
import {
  CompletionTimeRangeToggle,
  OverviewTimeRangeToggle,
} from './TimeRangeToggle';
import { CompletionHistoryChart } from '@restate/features/completion-history';
import { useCompletionChart } from './useCompletionChart';
import { useInFlightChart } from './useInFlightChart';

const LINE_COUNT = 7;

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: {
    isRefreshing: {
      true: 'animate-spin',
    },
  },
});

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

function useFlowConnectors(
  containerRef: React.RefObject<HTMLDivElement | null>,
  gaugeRef: React.RefObject<HTMLDivElement | null>,
  serverRef: React.RefObject<HTMLDivElement | null>,
  logsRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [data, setData] = useState<{
    segments: { x: number; y: number; dx: number }[];
    viewBox: string;
  }>({ segments: [], viewBox: '0 0 1 1' });

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    const server = serverRef.current;
    if (!container || !server) return;

    const update = () => {
      const cRect = container.getBoundingClientRect();
      const w = cRect.width;
      const h = cRect.height;
      if (w === 0 || h === 0) return;

      const sRect = server.getBoundingClientRect();
      const serverLeft = sRect.left - cRect.left;
      const serverRight = sRect.right - cRect.left;
      const serverY = sRect.top - cRect.top + sRect.height / 2;

      const segments: { x: number; y: number; dx: number }[] = [];

      const gauge = gaugeRef.current;
      if (gauge) {
        const gRect = gauge.getBoundingClientRect();
        const x = gRect.right - cRect.left - 12;
        segments.push({ x: serverLeft, y: serverY, dx: x - serverLeft });
      }

      const logs = logsRef.current;
      if (logs) {
        const lRect = logs.getBoundingClientRect();
        const x = lRect.left - cRect.left + 6;
        segments.push({ x: serverRight, y: serverY, dx: x - serverRight });
      }

      setData({ segments, viewBox: `0 0 ${w} ${h}` });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, gaugeRef, serverRef, logsRef, enabled]);

  return data;
}

const FLOW_PARTICLES = 5;
const FLOW_DURATION = 3600;

function FlowConnectors({
  segments,
  viewBox,
}: {
  segments: { x: number; y: number; dx: number }[];
  viewBox: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const particles = svg.querySelectorAll<SVGCircleElement>('[data-particle]');
    const animations = Array.from(particles).map((circle) => {
      const dx = Number(circle.dataset.dx);
      const index = Number(circle.dataset.index);
      return circle.animate(
        [
          { transform: 'translateX(0px)', opacity: 0 },
          { opacity: 0.32, offset: 0.2 },
          { opacity: 0.32, offset: 0.7 },
          { transform: `translateX(${dx}px)`, opacity: 0 },
        ],
        {
          duration: FLOW_DURATION,
          delay: (index * FLOW_DURATION) / FLOW_PARTICLES,
          iterations: Infinity,
          easing: 'linear',
        },
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [segments]);

  if (segments.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-[24] hidden h-full w-full @min-[64rem]/hero:block"
      viewBox={viewBox}
      fill="none"
    >
      {segments.map((segment, segmentIndex) =>
        Array.from({ length: FLOW_PARTICLES }).map((_, i) => (
          <circle
            key={`${segmentIndex}-${i}`}
            data-particle=""
            data-dx={segment.dx}
            data-index={i}
            cx={segment.x}
            cy={segment.y}
            opacity="0"
            r={i % 2 === 0 ? 1.8 : 1.2}
            fill="rgb(129 140 248 / 0.85)"
          />
        )),
      )}
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
  valueFormat,
  eyebrow,
  className,
  ref,
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
  valueFormat?: 'count' | 'approximate-percentage';
  eyebrow?: ReactNode;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={gaugeStyles({ class: className })}>
      <StatusArcEcharts
        segments={segments}
        isLoading={isLoading}
        valueFormat={valueFormat}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-4">
        {eyebrow && (
          <div className="pointer-events-auto -mb-0.5 flex min-h-4 items-center justify-center">
            {eyebrow}
          </div>
        )}
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
  const {
    servicesMap,
    deploymentsMap,
    totalCount,
    hasVqueues,
    serviceIssuesMap,
    isSummaryLoading,
    breakdownMode,
    setBreakdownMode,
    canSampleBreakdown,
    isSummaryError,
    summaryError,
    isInitialLoading,
    isBare,
    isEmpty,
    isError,
    error,
    isDeploymentsFetching,
    mode,
    filter,
    setFilter,
    triggerManualRefresh,
    overviewRefetchInterval,
  } = useOverviewContext();
  const completionChart = useCompletionChart();
  const inFlightChart = useInFlightChart();
  const servicesCount = servicesMap?.size ?? 0;
  const deploymentsCount = deploymentsMap?.size ?? 0;
  const isOverviewRefreshing = isSummaryLoading || isDeploymentsFetching;

  const { GettingStarted, status } = useRestateContext();

  const adminQueryPredicate = {
    predicate(query: { meta?: Record<string, unknown> }) {
      return Boolean(query.meta?.isAdmin);
    },
  };
  const isAdminMutating = useIsMutating(adminQueryPredicate) > 0;
  const metricsState = useMetricsState(overviewRefetchInterval);
  const isSummaryEmpty =
    !isSummaryLoading &&
    !completionChart.isSummaryBreakdownLoading &&
    !isSummaryError &&
    inFlightChart.allTotal === 0;
  const metricsVisible =
    metricsState.isMetricsEnabled &&
    metricsState.hasLoadedMetrics &&
    (inFlightChart.allTotal > 0 || metricsState.hasMetricActivity);

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
      inFlightChart.total > 0 ||
      metricsState.hasMetricActivity ||
      isAdminMutating,
    issueSeverity: overallIssueSeverity,
  });

  const filterRef = useFocusShortcut<HTMLInputElement>();

  const { triggerWave } = useWaveAnimation();
  const serverRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
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
  const flowConnectors = useFlowConnectors(
    containerRef,
    gaugeRef,
    serverRef,
    logsRef,
    heroReady,
  );
  const showHeroLegends =
    isSummaryLoading ||
    completionChart.isSummaryBreakdownLoading ||
    (!isSummaryError && totalCount > 0);
  const searchPlaceholder =
    mode === 'services' ? 'Search services…' : 'Search deployments…';
  const summaryErrorIndicator =
    !completionChart.isHistoryEnabled && summaryError ? (
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
    ) : null;
  const renderCompletionSummary = (
    className: string,
    legendClassName = 'min-w-0 place-items-start',
  ) => (
    <div className={className}>
      {completionChart.isHistoryEnabled && completionChart.successRateLabel && (
        <span className="px-1.5 text-sm font-semibold text-gray-700 tabular-nums">
          {completionChart.successRateLabel}
          <span className="ml-1 text-2xs font-normal text-gray-400">
            success rate
          </span>
        </span>
      )}
      <StatusLegend
        items={completionChart.segments}
        isLoading={completionChart.isLoading}
        isError={completionChart.isRangeError}
        orientation="vertical"
        className={legendClassName}
        isSampled={completionChart.isSampled}
        totalCount={completionChart.total}
      />
    </div>
  );

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
        <RestateServer
          className="flex h-auto min-h-[132px] flex-col items-center"
          status={ferrofluidStatus}
          isEmpty
          onPress={onRefresh}
        >
          {isError && !isDeploymentsFetching && (
            <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
              <ErrorPopoverPill
                error={error}
                label="Could not load the overview"
              />
              <p className="max-w-md px-4 text-sm text-gray-500">
                This may be a temporary issue.
              </p>
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
      {!isSummaryEmpty && (
        <FlowConnectors
          segments={flowConnectors.segments}
          viewBox={flowConnectors.viewBox}
        />
      )}
      <div className="relative z-30 grid w-full grid-cols-[minmax(4.75rem,1fr)_auto_minmax(4.75rem,1fr)] items-center justify-center justify-items-center gap-x-2 gap-y-0 px-4 pt-20 @min-[40rem]/hero:pt-8 @min-[64rem]/hero:grid-cols-[minmax(8rem,1fr)_auto_auto_auto_minmax(8rem,1fr)] @min-[64rem]/hero:gap-x-4 @min-[64rem]/hero:pt-16 @min-[76rem]/hero:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_minmax(12rem,1fr)] @min-[108rem]/hero:grid-cols-[minmax(16rem,1fr)_auto_auto_auto_minmax(16rem,1fr)] @min-[108rem]/hero:px-8 @min-[108rem]/hero:pt-20">
        <div className="hidden w-full min-w-0 self-center justify-self-end @min-[64rem]/hero:col-start-1 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:block">
          {showHeroLegends && (
            <StatusLegend
              items={inFlightChart.legendSegments}
              isLoading={isSummaryLoading}
              orientation="vertical"
              className="w-full min-w-0 justify-items-end"
              breakdown={{
                name: 'inbox',
                items: inFlightChart.inboxBreakdownSegments,
                isLoading: inFlightChart.isInboxBreakdownLoading,
                isError: inFlightChart.isInboxBreakdownError,
                isSampled: inFlightChart.isSampled,
              }}
            />
          )}
        </div>
        <HeroGauge
          ref={gaugeRef}
          className="col-start-2 row-start-1 @min-[64rem]/hero:col-start-2"
          segments={inFlightChart.segments}
          valueFormat={
            inFlightChart.isSampled ? 'approximate-percentage' : 'count'
          }
          count={inFlightChart.total}
          label={
            inFlightChart.total > 0 ? (
              <Ellipsis>In-flight / scheduled</Ellipsis>
            ) : (
              'In-flight'
            )
          }
          href={inFlightChart.href}
          isLoading={isSummaryLoading}
          isError={isSummaryError}
          eyebrow={
            hasVqueues ? <ChartContextValue>Overall</ChartContextValue> : null
          }
        />
        <EngineCore
          className="pointer-events-auto z-20 hidden @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:mx-10 @min-[64rem]/hero:flex"
          serverRef={serverRef}
          status={ferrofluidStatus}
          onPress={onRefresh}
          belowServer={
            canSampleBreakdown || summaryErrorIndicator ? (
              <div className="flex items-center gap-2">
                {canSampleBreakdown && (
                  <BreakdownMode
                    mode={breakdownMode}
                    onChange={setBreakdownMode}
                    format="sentence"
                  />
                )}
                {summaryErrorIndicator}
              </div>
            ) : undefined
          }
          aboveServer={
            <EngineEgressTop
              hasSummaryActivity={inFlightChart.allTotal > 0}
              metricsRefetchInterval={overviewRefetchInterval}
              data-overview-refresh-bounce=""
              className="pointer-events-auto mb-1"
            />
          }
        />
        {completionChart.isHistoryEnabled ? (
          <>
            {renderCompletionSummary(
              'col-start-2 row-start-2 mt-4 flex w-64 max-w-[calc(100vw-7rem)] min-w-0 flex-col items-center gap-1 self-start justify-self-center text-center @min-[40rem]/hero:w-72 @min-[64rem]/hero:hidden',
              'min-w-0 place-items-center',
            )}
            <CompletionHistoryChart
              ref={logsRef}
              buckets={completionChart.historyBuckets}
              isPending={completionChart.isHistoryLoading}
              onBucketClick={completionChart.onBucketClick}
              className="hidden h-20 w-40 self-start overflow-hidden @min-[26rem]/hero:w-44 @min-[40rem]/hero:w-[12.8rem] @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:block @min-[64rem]/hero:h-32 @min-[64rem]/hero:w-[15.4rem] @min-[64rem]/hero:self-center"
            />
          </>
        ) : (
          <HeroGauge
            ref={logsRef}
            className="col-start-2 row-start-2 mt-3 @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:mt-0"
            segments={completionChart.segments}
            count={completionChart.total}
            valueFormat={
              completionChart.isSampled ? 'approximate-percentage' : 'count'
            }
            valueLabel={completionChart.successRateLabel}
            label={
              completionChart.isEmpty ? 'No completed' : completionChart.label
            }
            sublabel={completionChart.sublabel}
            textOnly={completionChart.isEmpty}
            href={completionChart.href}
            isLoading={completionChart.isLoading}
            isError={completionChart.isError}
            eyebrow={
              hasVqueues ? (
                <CompletionTimeRangeToggle
                  value={completionChart.timeRange}
                  onChange={completionChart.setTimeRange}
                />
              ) : null
            }
          />
        )}
        {renderCompletionSummary(
          'hidden w-full min-w-0 flex-col gap-1 self-center justify-self-start @min-[64rem]/hero:col-start-5 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:flex',
        )}
        <OverviewMetricsRail
          side="left"
          hasSummaryActivity={inFlightChart.allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="col-start-1 row-span-2 row-start-1 self-center justify-self-end @min-[64rem]/hero:hidden"
        />
        <OverviewMetricsRail
          side="right"
          hasSummaryActivity={inFlightChart.allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="col-start-3 row-span-2 row-start-1 self-center justify-self-start @min-[64rem]/hero:hidden"
        />
        <InFlightMetrics
          hasSummaryActivity={inFlightChart.allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-2 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        <EngineEgress
          hasSummaryActivity={inFlightChart.allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        <CompletedMetrics
          hasSummaryActivity={inFlightChart.allTotal > 0}
          metricsRefetchInterval={overviewRefetchInterval}
          data-overview-refresh-bounce=""
          className="relative z-10 hidden self-start @min-[64rem]/hero:col-start-4 @min-[64rem]/hero:row-start-2 @min-[64rem]/hero:-mt-5 @min-[64rem]/hero:flex"
        />
        <div
          data-overview-refresh-bounce=""
          className={summaryStackStyles({ metricsVisible })}
        >
          <div className="pointer-events-auto flex items-center justify-center gap-2 whitespace-nowrap @max-[30rem]/hero:scale-90">
            {!hasVqueues && (
              <>
                {isSummaryLoading ? (
                  <span className="h-7 w-36 animate-pulse rounded-xl bg-gray-200" />
                ) : (
                  <span className="flex items-baseline gap-1.5">
                    {isSummaryEmpty ? (
                      <span className="text-base font-medium text-gray-400">
                        No invocations
                      </span>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-gray-700 tabular-nums">
                          {isSummaryError
                            ? '–'
                            : formatNumber(totalCount, true)}
                        </span>
                        <span className="text-base text-gray-500">
                          {totalCount === 1 ? 'invocation' : 'invocations'}
                        </span>
                      </>
                    )}
                  </span>
                )}
                <OverviewTimeRangeToggle />
              </>
            )}
            {canSampleBreakdown && (
              <span className="@min-[64rem]/hero:hidden">
                <BreakdownMode
                  mode={breakdownMode}
                  onChange={setBreakdownMode}
                  format="sentence"
                />
              </span>
            )}
            {summaryErrorIndicator && (
              <span className="@min-[64rem]/hero:hidden">
                {summaryErrorIndicator}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        data-overview-refresh-bounce=""
        className="relative z-40 mt-3 -mb-8 flex flex-col items-center"
      >
        <IssuesBannerStack />
        <div className="h-5" />
      </div>

      <div ref={setPanelEl} aria-hidden className="h-0 w-full shrink-0" />
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
          ],
        }}
      >
        <ContentPanelToolbar className="min-w-0 justify-end gap-2 px-1 pb-1">
          <SearchField
            aria-label={
              mode === 'services'
                ? 'Search services and handlers'
                : 'Search deployments'
            }
            value={filter}
            onChange={setFilter}
            enterKeyHint="search"
            className="group flex min-h-6.5 max-w-[38ch] min-w-0 flex-[1_1_38ch] items-center rounded-lg border border-gray-200 bg-white/70 text-gray-800 shadow-xs hover:bg-white has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500"
          >
            <Label className="sr-only">{searchPlaceholder}</Label>
            <Icon
              name={IconName.Search}
              className="ml-1.5 h-4 w-4 shrink-0 text-gray-400"
            />
            <AriaInput
              ref={filterRef}
              placeholder={searchPlaceholder}
              className="h-6 min-h-6 w-full min-w-0 border-0 bg-transparent py-0.5 pr-1 pl-1 text-sm text-current shadow-none outline-none placeholder:text-gray-500/75 focus:border-0 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {filter ? (
              <Button
                type="button"
                variant="icon"
                aria-label="Clear search"
                className="mr-0.5 flex h-5 w-5 shrink-0 rounded-md p-0 text-gray-400 shadow-none hover:bg-gray-100 hover:text-gray-600 pressed:bg-gray-200"
                onClick={() => setFilter('')}
              >
                <Icon name={IconName.X} className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <FocusShortcutKey variant="light" className="mr-1 shrink-0" />
            )}
          </SearchField>
          <DeploymentActions />
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label={
                  isOverviewRefreshing
                    ? 'Refreshing overview'
                    : 'Refresh overview'
                }
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={triggerManualRefresh}
                disabled={isOverviewRefreshing}
              >
                <Icon
                  name={IconName.Retry}
                  className={refreshIconStyles({
                    isRefreshing: isOverviewRefreshing,
                  })}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent size="sm">Refresh overview</TooltipContent>
          </Tooltip>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-20">
          <ContentPanelSection flush>
            {isError && !isDeploymentsFetching && error && (
              <ErrorBanner error={error} className="mx-2 mb-3 rounded-xl" />
            )}
            {mode === 'services' ? <ServicesTable /> : <DeploymentsTable />}
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
      <OverviewDialogs />
    </OverviewProvider>
  );
}

function OverviewDialogs() {
  const { mode } = useOverviewContext();

  return mode === 'deployments' ? <PruneDrainedDeploymentsDialog /> : null;
}

export const overview2 = { Component };
