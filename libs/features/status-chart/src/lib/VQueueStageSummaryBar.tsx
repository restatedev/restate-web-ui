import { Link } from '@restate/ui/link';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@restate/ui/tabs';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatApproxPercentage,
  formatNumber,
  formatPercentage,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import {
  DEFAULT_STYLE,
  INBOX_STAGE_GRADIENT,
  STATUS_LABELS,
  STATUS_STYLE,
} from './constants';
import { BreakdownMode } from './BreakdownMode';
import type { StatusEntry } from './useOrderedStatuses';
import { useEffect, useState } from 'react';

export type VQueueSummaryFocus = 'all' | 'not-completed' | 'completed';

export type VQueueStageSummaryEntry = StatusEntry & {
  statuses: string[];
  breakdownIsPartial: boolean;
};

export type VQueueStatusSummaryEntry = StatusEntry & {
  statuses: string[];
};

const INBOX_PATTERN =
  'repeating-linear-gradient(-45deg, transparent 0 4px, rgba(255, 255, 255, 0.28) 4px 6px)';
const INBOX_HIGHLIGHT =
  'linear-gradient(to bottom, rgba(255, 255, 255, 0.12), transparent 60%)';

const styles = tv({
  slots: {
    container:
      'grid w-full grid-cols-1 items-center gap-y-2 md:grid-cols-[1fr_auto_1fr]',
    tabs: 'contents',
    focusRow:
      'col-start-1 row-start-2 mx-auto flex items-center text-2xs text-zinc-500 md:col-start-2 md:row-start-1',
    breakdownControl:
      'col-start-1 row-start-1 justify-self-center md:justify-self-end md:pr-2',
    focusTabList:
      'gap-0 rounded-xl border-[0.5px] border-zinc-800/5 bg-black/3 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.03)]',
    focusTab: 'items-baseline gap-1.5 px-3 py-1.5 font-sans text-xs',
    focusCount: 'font-medium text-gray-500 tabular-nums',
    matches: 'text-3xs leading-none font-medium text-zinc-500',
    panels:
      'col-start-1 row-start-3 w-full overflow-visible md:col-span-3 md:row-start-2',
    panel: 'outline-none',
    rail: 'relative flex h-7 w-full items-stretch gap-1',
  },
  variants: {
    pulse: {
      true: {
        rail: 'animate-pulse',
      },
      false: {},
    },
  },
});

const skeletonStyles = tv({
  base: 'h-7 w-full animate-pulse rounded-md bg-slate-200',
});

const emptyStyles = tv({
  base: 'h-full w-full rounded-md border-[1.5px] border-dashed border-gray-300/70 bg-gray-200/70 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)]',
});

const segmentWrapStyles = tv({
  base: 'h-full min-w-[8px] transition-[flex-grow] duration-300 ease-out',
});

const segmentGroupStyles = tv({
  base: 'relative flex h-full min-w-[32px] items-stretch gap-0 overflow-visible transition-[flex-grow] duration-300 ease-out',
});

const segmentStyles = tv({
  base: 'relative h-full w-full min-w-[6px] overflow-hidden border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_4px_0_rgba(0,0,0,0.15)] transition hover:brightness-[1.03]',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
    dimmed: {
      true: 'opacity-40',
      false: '',
    },
    loading: {
      true: 'animate-pulse',
      false: '',
    },
    groupPosition: {
      standalone: 'rounded-md',
      only: 'rounded-md',
      first: 'rounded-l-md rounded-r-none',
      middle: 'rounded-none',
      last: 'rounded-l-none rounded-r-md',
    },
  },
  defaultVariants: {
    groupPosition: 'standalone',
  },
});

const tooltipDotStyles = tv({
  base: 'h-3 w-3 shrink-0 rounded-full border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
  },
});

const runningFlowStyles = tv({
  base: 'pointer-events-none absolute inset-0 animate-runningFlow opacity-20 motion-reduce:animate-none',
});

export function VQueueStageSummaryBar({
  byStage,
  byStatus,
  focus,
  onFocusChange,
  breakdownMode,
  canSampleBreakdown,
  onBreakdownModeChange,
  isLoading,
  isFetching,
  className,
  isDimmed,
  getHref,
  areStageCountsPartial,
  isBreakdownSampled,
  countsReflectFilters,
  isBreakdownLoading,
}: {
  byStage: VQueueStageSummaryEntry[];
  byStatus: VQueueStatusSummaryEntry[];
  focus: VQueueSummaryFocus;
  onFocusChange: (focus: VQueueSummaryFocus) => void;
  breakdownMode: 'estimate' | 'exact';
  canSampleBreakdown: boolean;
  onBreakdownModeChange: (mode: 'estimate' | 'exact') => void;
  isLoading?: boolean;
  isFetching?: boolean;
  className?: string;
  isDimmed?: (name: string) => boolean;
  getHref?: (name: string) => string;
  areStageCountsPartial?: boolean;
  isBreakdownSampled: boolean;
  countsReflectFilters?: boolean;
  isBreakdownLoading?: (stageName: string) => boolean;
}) {
  const [pendingFocus, setPendingFocus] = useState<VQueueSummaryFocus>();
  const selectedFocus = pendingFocus ?? focus;
  useEffect(() => {
    if (pendingFocus === focus) setPendingFocus(undefined);
  }, [focus, pendingFocus]);

  const inboxStage = byStage.find((stage) => stage.name === 'inbox');
  const inboxStatusNames = new Set(inboxStage?.statuses ?? []);
  const inboxStatuses = byStatus.filter((status) =>
    status.statuses.some((name) => inboxStatusNames.has(name)),
  );
  const visibleInboxStatuses = inboxStatuses.filter(
    (status) => status.count > 0,
  );
  const inboxBreakdownSegmentNames = new Set(
    inboxStatuses.map((status) => status.name),
  );
  const completedStage = byStage.find((stage) => stage.name === 'finished');
  const completedStatusNames = new Set(completedStage?.statuses ?? []);
  const completedStatuses = byStatus.filter((status) =>
    status.statuses.some((name) => completedStatusNames.has(name)),
  );
  const visibleCompletedStatuses = completedStatuses.filter(
    (status) => status.count > 0,
  );
  const completedBreakdownSegmentNames = new Set(
    completedStatuses.map((status) => status.name),
  );
  const allStages = byStage.filter((stage) => stage.count > 0);
  const notCompletedStages = byStage.filter(
    (stage) => stage.name !== 'finished' && stage.count > 0,
  );
  const notCompletedCount = notCompletedStages.reduce(
    (sum, stage) => sum + stage.count,
    0,
  );
  const completedCount = completedStage?.count ?? 0;
  const inboxBreakdownLoading = isBreakdownLoading?.('inbox') ?? false;
  const completedBreakdownLoading = isBreakdownLoading?.('finished') ?? false;
  const hasInboxBreakdown = visibleInboxStatuses.length > 0;
  const hasCompletedBreakdown = visibleCompletedStatuses.length > 0;
  const segments =
    selectedFocus === 'all'
      ? allStages
      : selectedFocus === 'not-completed'
        ? notCompletedStages
        : completedBreakdownLoading || !hasCompletedBreakdown
          ? completedStage
            ? [completedStage]
            : []
          : visibleCompletedStatuses;
  const focusedCount =
    selectedFocus === 'all'
      ? notCompletedCount + completedCount
      : selectedFocus === 'not-completed'
        ? notCompletedCount
        : completedCount;
  const {
    container,
    tabs,
    focusRow,
    breakdownControl,
    focusTabList,
    focusTab,
    focusCount,
    matches,
    panels,
    panel,
    rail,
  } = styles({
    pulse: Boolean(isFetching),
  });
  const populationTotal = notCompletedCount + completedCount;
  const populationCounts = areStageCountsPartial
    ? {
        all: null,
        notCompleted:
          populationTotal > 0
            ? formatApproxPercentage(notCompletedCount / populationTotal)
            : null,
        completed:
          populationTotal > 0
            ? formatApproxPercentage(completedCount / populationTotal)
            : null,
      }
    : {
        all: formatNumber(populationTotal, true),
        notCompleted: formatNumber(notCompletedCount, true),
        completed: formatNumber(completedCount, true),
      };
  const matchesIndicator = countsReflectFilters ? (
    <span
      className={matches()}
      title="Count reflects the current invocation filters"
    >
      matches
    </span>
  ) : null;

  if (isLoading) {
    return (
      <div className={container({ class: className })}>
        <div
          className={skeletonStyles({ class: 'col-span-full' })}
          aria-hidden
        />
      </div>
    );
  }

  const renderSegment = (
    segment: VQueueStageSummaryEntry | VQueueStatusSummaryEntry,
    groupPosition:
      | 'standalone'
      | 'only'
      | 'first'
      | 'middle'
      | 'last' = 'standalone',
  ) => {
    const style = STATUS_STYLE[segment.name] ?? DEFAULT_STYLE;
    const label = segment.label ?? STATUS_LABELS[segment.name] ?? segment.name;
    const isInboxStatus = inboxBreakdownSegmentNames.has(segment.name);
    const isCompletedStatus = completedBreakdownSegmentNames.has(segment.name);
    const dimmed = isDimmed?.(segment.name) ?? false;
    const segmentIsLoading =
      (selectedFocus !== 'completed' &&
        inboxBreakdownLoading &&
        segment.name === 'inbox') ||
      (selectedFocus !== 'not-completed' &&
        completedBreakdownLoading &&
        segment.name === 'finished');
    const approximate = isCompletedStatus
      ? isBreakdownSampled || completedStage?.breakdownIsPartial
      : isInboxStatus
        ? isBreakdownSampled || inboxStage?.breakdownIsPartial
        : areStageCountsPartial;
    const percentage = approximate
      ? formatApproxPercentage(segment.count / focusedCount)
      : formatPercentage(segment.count / focusedCount);
    const ariaLabel = approximate
      ? `${label}: ${percentage}`
      : `${label}: ${segment.count} (${percentage})`;
    const backgroundGradient = `linear-gradient(to bottom, color-mix(in srgb, white 22%, ${style.fillLight}), ${style.fillLight})`;
    const isGrouped = groupPosition !== 'standalone';

    return (
      <div
        key={segment.name}
        className={segmentWrapStyles()}
        style={{ flexGrow: segment.count, flexBasis: 0 }}
      >
        <HoverTooltip
          className="h-full"
          size="lg"
          content={
            <div className="flex items-center whitespace-nowrap">
              <span
                className={tooltipDotStyles({
                  borderType: style.borderType ? 'dashed' : 'solid',
                })}
                style={{
                  backgroundColor: style.fillLight,
                  backgroundImage:
                    segment.name === 'inbox' ? INBOX_STAGE_GRADIENT : undefined,
                  borderColor: style.stroke,
                }}
              />
              <span className="mr-2 ml-2 text-base! text-gray-300!">
                {label}
              </span>
              {approximate ? (
                <span className="text-base! font-semibold text-gray-50!">
                  {percentage}
                </span>
              ) : (
                <>
                  <span className="text-base! font-semibold text-gray-50!">
                    {formatNumber(segment.count)}
                  </span>
                  <span className="ml-1 text-base! font-medium text-gray-200!">
                    ({percentage})
                  </span>
                </>
              )}
            </div>
          }
        >
          <div
            className={segmentStyles({
              borderType: style.borderType ? 'dashed' : 'solid',
              dimmed,
              loading: segmentIsLoading,
              groupPosition,
            })}
            style={{
              backgroundColor: style.fillLight,
              backgroundImage:
                segment.name === 'inbox'
                  ? `${INBOX_PATTERN}, ${INBOX_HIGHLIGHT}, ${INBOX_STAGE_GRADIENT}`
                  : isGrouped && isInboxStatus
                    ? `${INBOX_PATTERN}, ${backgroundGradient}`
                    : backgroundGradient,
              borderColor: style.stroke,
              borderLeftWidth:
                groupPosition === 'middle' || groupPosition === 'last'
                  ? 0
                  : undefined,
            }}
            aria-label={getHref ? undefined : ariaLabel}
          >
            {segment.name === 'running' && !dimmed && (
              <span
                className={runningFlowStyles()}
                style={{
                  left: '-16.97px',
                  backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 4px, ${style.fillDark} 4px 6px)`,
                }}
                aria-hidden
              />
            )}
            {getHref && (
              <Link
                href={getHref(segment.name)}
                preserveQueryParams={false}
                variant="secondary"
                aria-label={ariaLabel}
                className="absolute inset-0 block rounded-[inherit] no-underline outline-none"
              />
            )}
          </div>
        </HoverTooltip>
      </div>
    );
  };

  const renderSegmentGroup = (
    stage: VQueueStageSummaryEntry | undefined,
    groupedSegments: VQueueStatusSummaryEntry[],
    ariaLabel: string,
  ) => {
    if (!stage) return null;
    return (
      <div
        key={stage.name}
        className={segmentGroupStyles()}
        style={{ flexGrow: stage.count, flexBasis: 0 }}
        aria-label={ariaLabel}
      >
        {groupedSegments.map((segment, index) =>
          renderSegment(
            segment,
            groupedSegments.length === 1
              ? 'only'
              : index === 0
                ? 'first'
                : index === groupedSegments.length - 1
                  ? 'last'
                  : 'middle',
          ),
        )}
      </div>
    );
  };

  const showInboxGroup =
    selectedFocus !== 'completed' &&
    !inboxBreakdownLoading &&
    hasInboxBreakdown;
  const showCompletedGroup =
    selectedFocus === 'all' &&
    !completedBreakdownLoading &&
    hasCompletedBreakdown;
  const focusedStages =
    selectedFocus === 'all' ? allStages : notCompletedStages;
  const focusedStageLoading =
    selectedFocus === 'completed' &&
    completedBreakdownLoading &&
    !completedStage;

  const summaryRail = (
    <div
      className={rail()}
      aria-label={
        selectedFocus === 'all'
          ? 'All invocation stages'
          : selectedFocus === 'not-completed'
            ? 'Not-completed invocation stages'
            : 'Completed invocation outcomes'
      }
    >
      {focusedStageLoading ? (
        <div className={skeletonStyles()} aria-hidden />
      ) : focusedCount === 0 ? (
        <div className={emptyStyles()} />
      ) : showInboxGroup || showCompletedGroup ? (
        focusedStages.map((stage) =>
          stage.name === 'inbox' && showInboxGroup
            ? renderSegmentGroup(
                inboxStage,
                visibleInboxStatuses,
                'Inbox status breakdown',
              )
            : stage.name === 'finished' && showCompletedGroup
              ? renderSegmentGroup(
                  completedStage,
                  visibleCompletedStatuses,
                  'Completed outcome breakdown',
                )
              : renderSegment(stage),
        )
      ) : (
        segments.map((segment) => renderSegment(segment))
      )}
    </div>
  );

  return (
    <div className={container({ class: className })}>
      {canSampleBreakdown && (
        <div className={breakdownControl()}>
          <BreakdownMode
            mode={breakdownMode}
            onChange={onBreakdownModeChange}
            format="sentence"
          />
        </div>
      )}
      <Tabs
        selectedTab={selectedFocus}
        onTabChange={(tab) => {
          const nextFocus = tab as VQueueSummaryFocus;
          setPendingFocus(nextFocus);
          onFocusChange(nextFocus);
        }}
        className={tabs()}
      >
        <div className={focusRow()}>
          <TabList aria-label="Invocation breakdown" className={focusTabList()}>
            <Tab id="all" className={focusTab()}>
              <span>All</span>
              {populationCounts.all && (
                <span className={focusCount()}>{populationCounts.all}</span>
              )}
              {selectedFocus === 'all' ? matchesIndicator : null}
            </Tab>
            <Tab id="not-completed" className={focusTab()}>
              <span>Not completed</span>
              {populationCounts.notCompleted && (
                <span className={focusCount()}>
                  {populationCounts.notCompleted}
                </span>
              )}
              {selectedFocus === 'not-completed' ? matchesIndicator : null}
            </Tab>
            <Tab id="completed" className={focusTab()}>
              <span>Completed</span>
              {populationCounts.completed && (
                <span className={focusCount()}>
                  {populationCounts.completed}
                </span>
              )}
              {selectedFocus === 'completed' ? matchesIndicator : null}
            </Tab>
          </TabList>
        </div>
        <TabPanels className={panels()}>
          <TabPanel id="all" className={panel()}>
            {selectedFocus === 'all' ? summaryRail : null}
          </TabPanel>
          <TabPanel id="not-completed" className={panel()}>
            {selectedFocus === 'not-completed' ? summaryRail : null}
          </TabPanel>
          <TabPanel id="completed" className={panel()}>
            {selectedFocus === 'completed' ? summaryRail : null}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
