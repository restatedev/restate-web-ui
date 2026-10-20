import { useRef, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { SearchField, Input as AriaInput, Label } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { Link } from '@restate/ui-link';
import { RestateServer } from '@restate/ui-restate-server';
import { useRestateContext } from '@restate/features-restate-context';
import { PruneDrainedDeploymentsDialog } from '@restate/features-prune-deployments';
import { useIsMutating } from '@tanstack/react-query';
import { useFocusShortcut, FocusShortcutKey } from '@restate/ui-keyboard';
import { formatNumber } from '@restate/util-intl';
import { IssuesBannerStack } from '@restate/ui-issue-banner';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui-tooltip';
import { ErrorBanner } from '@restate/ui-error';
import { Button } from '@restate/ui-button';
import {
  StatusArcEcharts,
  StatusLegend,
  BreakdownMode,
  ChartContextValue,
  type ArcSegment,
} from '@restate/features-status-chart';
import { useWaveAnimation } from '@restate/ui-wave-animation';
import { OVERVIEW_WAVE_TARGET } from './overviewWave';
import { Ellipsis, Spinner } from '@restate/ui-loading';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import { OverviewProvider, useOverviewContext } from './OverviewContext';
import { ErrorPopoverPill } from './ErrorPopoverPill';
import { useRestateServerStatus } from './useRestateServerStatus';
import { NoDeploymentPlaceholder } from './NoDeploymentPlaceholder';
import { EngineCore } from './EngineCluster';
import { OVERVIEW_MODE_PARAM } from './overviewMode';
import { DeploymentActions } from './DeploymentActions';
import { ServicesTable } from './ServicesTable';
import { DeploymentsTable } from './DeploymentsTable';
import { CompletionTimeRangeToggle } from './TimeRangeToggle';
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
  svgRef: React.RefObject<SVGSVGElement | null>,
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
    const svg = svgRef.current;
    const server = serverRef.current;
    if (!svg || !server || !panel) return;
    const tabs =
      panel.nextElementSibling?.querySelector<HTMLElement>(
        '[role="tablist"]',
      ) ?? panel;

    const update = () => {
      const cRect = svg.getBoundingClientRect();
      const sRect = server.getBoundingClientRect();
      const pRect = panel.getBoundingClientRect();
      const tRect = tabs.getBoundingClientRect();

      const w = cRect.width;
      const h = cRect.height;
      if (w === 0 || h === 0) return;

      const serverCenterX = sRect.left + sRect.width / 2 - cRect.left;
      const startY = sRect.bottom - cRect.top;
      const startSpread = sRect.width / 4;
      const endY = tRect.top - cRect.top;
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
    observer.observe(svg);
    observer.observe(panel);
    observer.observe(tabs);
    for (
      let sibling = panel.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      observer.observe(sibling);
    }
    return () => observer.disconnect();
  }, [svgRef, serverRef, panel, enabled]);

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
      className="pointer-events-none absolute inset-x-0 top-0 z-[25] hidden h-full w-full text-subtle @min-[64rem]/hero:block"
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
            className="fill-accent-vivid/85"
          />
        )),
      )}
    </svg>
  );
}

const emptyServerStyles = tv({
  base: 'flex w-full flex-auto flex-col items-center justify-center overflow-hidden rounded-xl border bg-emphasis/50 pt-24 pb-8 shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] ring-1 ring-surface/80 @tall:pt-10 @tall:pb-40',
  variants: {
    isError: {
      true: '[&>svg:first-child>path]:fill-danger-muted',
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
      <span className="ml-1 inline-block h-3 w-5 animate-pulse rounded bg-emphasis" />
    );
  }
  return (
    <span className="ml-1 rounded bg-muted px-1 py-px text-2xs font-medium text-muted tabular-nums">
      {formatNumber(count, true)}
    </span>
  );
}

const gaugeStyles = tv({
  base: 'relative -mb-7 aspect-square w-36 shrink-0 overflow-visible @min-[26rem]/hero:w-40 @min-[40rem]/hero:w-[11.25rem] @min-[64rem]/hero:-mb-9 @min-[64rem]/hero:w-[13.2rem]',
});

const gaugeLabelStyles = tv({
  base: 'text-xs text-muted',
  variants: {
    textOnly: {
      true: 'text-sm font-medium text-subtle',
      false: 'mt-1',
    },
  },
});

const summaryStackStyles = tv({
  base: 'relative z-40 col-span-3 col-start-1 row-start-3 mt-1 flex flex-col items-center @min-[64rem]/hero:col-span-1 @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:mt-2',
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
          <div className="h-7 w-14 animate-pulse rounded-lg bg-emphasis sm:h-8" />
        ) : isError ? (
          <span className="text-xl font-semibold text-faint">–</span>
        ) : (
          <Link
            href={href}
            variant="icon"
            preserveQueryParams={false}
            className="pointer-events-auto relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 leading-none hover:bg-tint-subtle"
          >
            {!textOnly && (
              <span className="text-2xl font-semibold text-primary tabular-nums">
                {valueLabel ?? formatNumber(count, true)}
              </span>
            )}
            <span className={gaugeLabelStyles({ textOnly })}>{label}</span>
            {sublabel && (
              <span className="absolute top-full left-1/2 mt-0 hidden -translate-x-1/2 text-2xs whitespace-nowrap text-subtle tabular-nums @min-[40rem]/hero:block">
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
    serviceIssuesMap,
    isSummaryLoading,
    breakdownMode,
    setBreakdownMode,
    isSummaryFromStats,
    isSummaryError,
    summaryError,
    isInitialLoading,
    isBare,
    isEmpty,
    isError,
    error,
    isDeploymentsFetching,
    isServicesPending,
    mode,
    filter,
    setFilter,
    triggerManualRefresh,
  } = useOverviewContext();
  const completionChart = useCompletionChart();
  const inFlightChart = useInFlightChart();
  const showsBreakdownMode =
    completionChart.usesBreakdownMode || !isSummaryFromStats;
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
  const isSummaryEmpty =
    !isSummaryLoading &&
    !completionChart.isSummaryBreakdownLoading &&
    !isSummaryError &&
    inFlightChart.allTotal === 0;

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
    isActive: inFlightChart.total > 0 || isAdminMutating,
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
    linesSvgRef,
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
  const summaryErrorIndicator = summaryError ? (
    <Popover>
      <PopoverTrigger>
        <Button
          aria-label="Could not load invocation data"
          variant="secondary"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-danger/80 bg-danger-subtle p-0 text-danger shadow-none hover:bg-danger-muted"
        >
          <Icon
            name={IconName.TriangleAlert}
            className="h-4 w-4 fill-danger-emphasis text-danger"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm">
        <ErrorBanner error={summaryError} className="rounded-xl" />
      </PopoverContent>
    </Popover>
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
    triggerWave(serverRef, OVERVIEW_WAVE_TARGET);
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
              <p className="max-w-md px-4 text-sm text-muted">
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
          eyebrow={<ChartContextValue>Overall</ChartContextValue>}
        />
        <EngineCore
          className="pointer-events-auto z-20 hidden @min-[64rem]/hero:col-start-3 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:mx-10 @min-[64rem]/hero:flex"
          serverRef={serverRef}
          status={ferrofluidStatus}
          onPress={onRefresh}
          belowServer={
            showsBreakdownMode || summaryErrorIndicator ? (
              <div className="flex items-center gap-2">
                {showsBreakdownMode && (
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
        />
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
            <CompletionTimeRangeToggle
              value={completionChart.timeRange}
              onChange={completionChart.setTimeRange}
            />
          }
        />
        <div className="hidden w-full min-w-0 flex-col gap-1 self-center justify-self-start @min-[64rem]/hero:col-start-5 @min-[64rem]/hero:row-start-1 @min-[64rem]/hero:flex">
          <StatusLegend
            items={completionChart.segments}
            isLoading={completionChart.isLoading}
            isError={completionChart.isRangeError}
            orientation="vertical"
            className="min-w-0 place-items-start"
            isSampled={completionChart.isSampled}
            totalCount={completionChart.total}
          />
        </div>
        <div data-overview-refresh-bounce="" className={summaryStackStyles()}>
          <div className="pointer-events-auto flex items-center justify-center gap-2 whitespace-nowrap @max-[30rem]/hero:scale-90">
            {showsBreakdownMode && (
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
                    isLoading={isDeploymentsFetching || isServicesPending}
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
            className="group flex min-h-6.5 max-w-[38ch] min-w-0 flex-[1_1_38ch] items-center rounded-lg border border-default bg-surface/70 text-primary shadow-xs hover:bg-surface has-[input[data-focused=true]]:border-accent-strong has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-focus"
          >
            <Label className="sr-only">{searchPlaceholder}</Label>
            <Icon
              name={IconName.Search}
              className="ml-1.5 h-4 w-4 shrink-0 text-subtle"
            />
            <AriaInput
              ref={filterRef}
              placeholder={searchPlaceholder}
              className="h-6 min-h-6 w-full min-w-0 border-0 bg-transparent py-0.5 pr-1 pl-1 text-sm text-current shadow-none outline-none placeholder:text-subtle focus:border-0 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {filter ? (
              <Button
                type="button"
                variant="icon"
                aria-label="Clear search"
                className="mr-0.5 flex h-5 w-5 shrink-0 rounded-md p-0 text-subtle shadow-none hover:bg-muted hover:text-tertiary pressed:bg-emphasis"
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

export const overview = { Component };
