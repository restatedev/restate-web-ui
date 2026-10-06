import {
  filterInvocationSummaryByStatus,
  getRepresentedStatuses,
  type StatusFilter,
} from '@restate/features/invocations-route';
import {
  VQueueStageLegend,
  VQueueStageSummaryBar,
} from '@restate/features/status-chart';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { useInvocationsTab } from './useInvocationsTab';

const styles = tv({
  slots: {
    frame:
      'relative z-20 -mb-1 border-b border-gray-200/80 px-1 pt-[calc(var(--cp-section-pt,0px)+0.5rem)] pb-1.5',
    content:
      'flex w-full min-w-0 flex-col items-stretch gap-2.5 px-4 pt-0 pb-1',
    pageLink:
      'group/page-link inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-2xs font-medium text-zinc-500 no-underline transition-colors hover:bg-black/[0.035] hover:text-zinc-700 focus-visible:bg-black/[0.035] focus-visible:text-zinc-700 pressed:bg-black/[0.07]',
    pageLinkIcon:
      'h-3 w-3 text-zinc-400 transition-colors group-hover/page-link:text-zinc-500',
  },
});

export function InvocationsStatusSummary({
  invocationsTab,
  className,
}: {
  invocationsTab: ReturnType<typeof useInvocationsTab>;
  className?: string;
}) {
  const navigate = useNavigate();
  const {
    summary,
    statusFilter,
    countMode,
    setCountMode,
    hrefForStatusFilter,
    invocationsPageHref,
  } = invocationsTab;
  const matching = useMemo(
    () =>
      filterInvocationSummaryByStatus(
        summary.byStage,
        summary.byStatus,
        statusFilter,
      ),
    [summary.byStage, summary.byStatus, statusFilter],
  );
  const bucketStatuses = (name: string) => {
    if (name === 'not-completed') {
      return summary.byStage
        .filter((stage) => stage.name !== 'finished')
        .flatMap((stage) => stage.statuses);
    }
    return (
      summary.byStatus.find((bucket) => bucket.name === name)?.statuses ??
      summary.byStage.find((stage) => stage.name === name)?.statuses
    );
  };
  const getHref = (statusName: string, representedStatuses?: string[]) => {
    const statuses = getRepresentedStatuses(
      statusName,
      representedStatuses,
      bucketStatuses(statusName),
    );
    if (!statuses || statuses.length === 0) {
      return hrefForStatusFilter(statusFilter);
    }
    const operation = statusName === 'not-completed' ? 'NOT_IN' : 'IN';
    const isCurrent =
      statusFilter?.operation === operation &&
      statusFilter.value.length === statuses.length &&
      statuses.every((status) => statusFilter.value.includes(status));
    return hrefForStatusFilter(
      isCurrent
        ? undefined
        : ({
            field: 'status',
            type: 'STRING_LIST',
            operation,
            value: statuses,
          } as StatusFilter),
    );
  };
  const changeFocus = (focus: 'all' | 'completed' | 'not-completed') => {
    navigate(
      focus === 'all'
        ? hrefForStatusFilter(undefined)
        : getHref(focus === 'completed' ? 'finished' : 'not-completed'),
      { preventScrollReset: true },
    );
  };
  const areStageCountsPartial = Boolean(summary.data?.stageCountsArePartial);
  const s = styles();

  return (
    <div className={s.frame({ className })}>
      <div className={s.content()} aria-busy={summary.isFetching}>
        <VQueueStageSummaryBar
          byStage={matching.byStage}
          byStatus={matching.byStatus}
          focus={summary.focus}
          onFocusChange={changeFocus}
          breakdownMode={countMode}
          canSampleBreakdown={summary.canSampleBreakdown}
          onBreakdownModeChange={setCountMode}
          isLoading={summary.isLoading}
          isFetching={summary.isFetching}
          isError={summary.isError}
          isBreakdownError={summary.isBreakdownError}
          isDimmed={summary.isDimmed}
          getHref={getHref}
          areStageCountsPartial={areStageCountsPartial}
          isBreakdownSampled={summary.breakdownIsSampled}
          populationByStage={summary.byStage}
          populationByStatus={summary.byStatus}
          comparisonScope={summary.hasServiceScope ? 'service' : 'all'}
          isBreakdownLoading={summary.isBreakdownLoading}
          trailing={
            <Link
              href={invocationsPageHref}
              variant="secondary"
              preserveQueryParams={false}
              className={s.pageLink()}
            >
              View in Invocations
              <Icon name={IconName.ArrowUpRight} className={s.pageLinkIcon()} />
            </Link>
          }
        />
        <VQueueStageLegend
          byStage={matching.byStage}
          byStatus={matching.byStatus}
          focus={summary.focus}
          isBreakdownSampled={summary.breakdownIsSampled}
          areStageCountsPartial={areStageCountsPartial}
          isLoading={summary.isLoading}
          isError={summary.isError}
          isDimmed={summary.isDimmed}
          getHref={getHref}
          populationByStage={summary.byStage}
          populationByStatus={summary.byStatus}
          isBreakdownLoading={summary.isBreakdownLoading}
          isBreakdownError={summary.isBreakdownError}
        />
      </div>
    </div>
  );
}
