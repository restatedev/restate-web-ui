import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatApproxPercentage, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import {
  COMPLETED_STAGE_LEGEND_GRADIENT,
  DEFAULT_STYLE,
  INBOX_STAGE_LEGEND_GRADIENT,
  INVOCATION_SUMMARY_STAGES,
  NOT_COMPLETED_INVOCATION_STAGES,
  STATUS_LABELS,
  STATUS_STYLE,
} from './constants';
import type {
  VQueueStageSummaryEntry,
  VQueueStatusSummaryEntry,
  VQueueSummaryFocus,
} from './VQueueStageSummaryBar';
import { StageBreakdownPopoverContent } from './StageBreakdownPopoverContent';

const legendStyles = tv({
  base: 'mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm',
});

const itemStyles = tv({
  base: 'flex items-center rounded-md transition',
  variants: {
    appearance: {
      normal: '',
      dimmed: 'opacity-40 saturate-50',
      faded: 'opacity-50',
    },
  },
});

const linkStyles = tv({
  base: 'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-gray-700 no-underline outline-offset-2 outline-blue-600 hover:bg-black/5 focus-visible:outline-2',
});

const bulletStyles = tv({
  base: 'h-3 w-3 shrink-0 rounded-full border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
  variants: {
    borderType: {
      dashed: 'border-dashed',
      solid: 'border-solid',
    },
    loading: {
      true: 'animate-pulse opacity-40',
      false: '',
    },
  },
});

const countStyles = tv({
  base: 'inline-block shrink-0 rounded-xs bg-gray-50/60 px-1 py-px font-medium text-gray-500 tabular-nums',
  variants: {
    loading: {
      true: 'animate-pulse bg-gray-200 text-transparent',
      false: '',
    },
  },
});

function shouldShowStatus(status: VQueueStatusSummaryEntry) {
  return (
    status.count > 0 || (status.name !== 'ready' && status.name !== 'yielded')
  );
}

export function VQueueStageLegend({
  byStage,
  byStatus,
  focus,
  isBreakdownSampled,
  areStageCountsPartial,
  isLoading,
  isError,
  className,
  isDimmed,
  getHref,
  isBreakdownLoading,
  isBreakdownError,
}: {
  byStage: VQueueStageSummaryEntry[];
  byStatus: VQueueStatusSummaryEntry[];
  focus: VQueueSummaryFocus;
  isBreakdownSampled: boolean;
  areStageCountsPartial?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
  isDimmed?: (name: string) => boolean;
  getHref: (name: string) => string;
  isBreakdownLoading?: (stageName: string) => boolean;
  isBreakdownError?: (stageName: string) => boolean;
}) {
  const stageData = new Map(byStage.map((stage) => [stage.name, stage]));
  const completedStage = stageData.get('finished');
  const completedStatusNames = new Set(completedStage?.statuses ?? []);
  const completedCount = completedStage?.count ?? 0;
  const notCompletedCount = byStage
    .filter((stage) => stage.name !== 'finished')
    .reduce((total, stage) => total + stage.count, 0);
  const focusedCount =
    focus === 'completed'
      ? completedCount
      : focus === 'not-completed'
        ? notCompletedCount
        : notCompletedCount + completedCount;
  const completedBreakdownLoading = isBreakdownLoading?.('finished') ?? false;
  const stageNames =
    focus === 'all'
      ? INVOCATION_SUMMARY_STAGES
      : NOT_COMPLETED_INVOCATION_STAGES;
  const items =
    focus !== 'completed'
      ? stageNames.map((name) => {
          const stage = stageData.get(name);
          return {
            name,
            label: stage?.label ?? STATUS_LABELS[name] ?? name,
            count: stage?.count ?? 0,
            statuses: stage?.statuses ?? [],
            breakdownIsPartial: stage?.breakdownIsPartial ?? false,
            expandable: name === 'inbox',
            loading: Boolean(
              isLoading || (!stage && isBreakdownLoading?.(name)),
            ),
          };
        })
      : byStatus
          .filter(shouldShowStatus)
          .filter((status) =>
            status.statuses.some((name) => completedStatusNames.has(name)),
          )
          .map((status) => ({
            name: status.name,
            label: status.label ?? STATUS_LABELS[status.name] ?? status.name,
            count: status.count,
            statuses: status.statuses,
            breakdownIsPartial: completedStage?.breakdownIsPartial ?? false,
            expandable: false,
            loading: completedBreakdownLoading,
          }));

  return (
    <div
      className={legendStyles({ class: className })}
      aria-label="Invocation stage legend"
    >
      {items.map((item) => {
        const style = STATUS_STYLE[item.name] ?? DEFAULT_STYLE;
        const appearance = isDimmed?.(item.name)
          ? 'dimmed'
          : item.count === 0
            ? 'faded'
            : 'normal';
        const itemStatuses = new Set(item.statuses);
        const breakdownStatuses = byStatus
          .filter(shouldShowStatus)
          .filter((status) =>
            status.statuses.some((name) => itemStatuses.has(name)),
          )
          .map((status) => ({
            name: status.name,
            label: status.label ?? STATUS_LABELS[status.name] ?? status.name,
            count: status.count,
            ...(STATUS_STYLE[status.name] ?? DEFAULT_STYLE),
          }));
        const itemBreakdownLoading = isBreakdownLoading?.(item.name) ?? false;
        const itemBreakdownError = isBreakdownError?.(item.name) ?? false;
        const countIsSampled =
          areStageCountsPartial ||
          (focus === 'completed' &&
            (isBreakdownSampled || item.breakdownIsPartial));
        const count =
          countIsSampled && focusedCount > 0
            ? formatApproxPercentage(item.count / focusedCount)
            : formatNumber(item.count, true);

        return (
          <div key={item.name} className={itemStyles({ appearance })}>
            <Link
              href={getHref(item.name)}
              preserveQueryParams={false}
              variant="secondary"
              className={linkStyles()}
              disabled={Boolean(isLoading || isError || item.loading)}
            >
              <span
                className={bulletStyles({
                  borderType: style.borderType ? 'dashed' : 'solid',
                  loading: item.loading,
                })}
                style={{
                  backgroundColor: style.fillLight,
                  backgroundImage:
                    item.name === 'inbox'
                      ? INBOX_STAGE_LEGEND_GRADIENT
                      : item.name === 'finished'
                        ? COMPLETED_STAGE_LEGEND_GRADIENT
                        : undefined,
                  borderColor: style.stroke,
                }}
              />
              <span>{item.label}</span>{' '}
              <span className={countStyles({ loading: item.loading })}>
                {count}
              </span>
            </Link>
            {item.expandable && (
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="icon"
                    aria-label={`Show ${item.label} breakdown`}
                    className="mr-0.5 h-5 w-5 rounded-md p-0"
                    disabled={Boolean(isLoading || isError)}
                  >
                    <Icon
                      name={IconName.ChevronsUpDown}
                      className="h-3.5 w-3.5 text-gray-400"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent placement="bottom" className="w-72">
                  <StageBreakdownPopoverContent
                    label={item.label}
                    count={item.count}
                    populationTotal={focusedCount}
                    countIsPartial={areStageCountsPartial}
                    items={breakdownStatuses.map((status) => ({
                      ...status,
                      href: getHref(status.name),
                    }))}
                    isLoading={itemBreakdownLoading}
                    isError={itemBreakdownError}
                    valuesAreSampled={
                      isBreakdownSampled || item.breakdownIsPartial
                    }
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      })}
      {focus === 'completed' && isBreakdownError?.('finished') && (
        <span className="text-xs text-red-700">
          Could not load the completed breakdown.
        </span>
      )}
    </div>
  );
}
