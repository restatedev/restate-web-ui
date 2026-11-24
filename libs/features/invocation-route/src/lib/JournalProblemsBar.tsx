import { Fragment, memo, useEffect, useRef, useState } from 'react';
import { Input as AriaInput, Label, SearchField } from 'react-aria-components';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { FocusShortcutKey, useFocusShortcut } from '@restate/ui-keyboard';
import { Spinner } from '@restate/ui-loading';
import { HoverTooltip } from '@restate/ui-tooltip';
import { formatNumber } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { InvocationStatusCheckFailure } from '@restate/data-access-admin-api-hooks';
import type { ProblemStats } from './problemRows';

export interface JournalProblemsBarProps {
  isProblemsOnly: boolean;
  onModeChange: (problemsOnly: boolean) => void;
  problemTotal: number;
  problemStats: ProblemStats;
  find: string;
  onFindChange: (value: string) => void;
  matchCount?: number;
  navigableTotal: number;
  announcement: string;
  checkProgress?: {
    checked: number;
    total: number;
    failure?: InvocationStatusCheckFailure;
  };
  checkLimit?: {
    checked: number;
    total: number;
  };
  onPrevious: () => void;
  onNext: () => void;
}

const modeStyles = tv({
  slots: {
    base: 'mr-auto flex min-w-0 items-center gap-2 self-end',
    group:
      'inline-flex shrink-0 items-stretch rounded-xl border-[0.5px] border-tint-subtle bg-tint-subtle shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)]',
    divider: 'my-1.5 border-l border-tint',
    arrow:
      'flex items-center rounded-xl border border-transparent px-1.5 py-1 text-tertiary shadow-none hover:text-primary disabled:text-faint disabled:hover:bg-transparent',
    field:
      'group flex max-w-[28ch] min-w-[10ch] flex-[1_1_28ch] items-center rounded-xl border-[0.5px] border-tint-subtle bg-tint-subtle text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] has-[input[data-focused=true]]:border-accent-strong has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-focus',
    searchIcon: 'ml-2 h-3.5 w-3.5 shrink-0 text-muted',
    input:
      'h-6.5 min-h-6.5 w-full min-w-0 border-0 bg-transparent py-0.5 pr-1 pl-1.5 text-xs text-current shadow-none outline-none placeholder:text-muted focus:border-0 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
    shortcut: 'mr-1.5 shrink-0 px-1 text-2xs leading-4',
    matches: 'mr-1 shrink-0 text-2xs text-muted tabular-nums',
    clear:
      'mr-0.5 flex h-5 w-5 shrink-0 rounded-md p-0 text-subtle shadow-none hover:bg-muted hover:text-tertiary pressed:bg-emphasis',
  },
});

const modeSegmentStyles = tv({
  base: 'flex shrink-0 items-center gap-1 rounded-xl border border-transparent px-2.5 py-1 font-sans text-xs whitespace-nowrap text-tertiary shadow-none',
  variants: {
    isSelected: {
      true: 'border-tint bg-raised text-primary shadow-xs',
      false: '',
    },
  },
});

const modeCountStyles = tv({
  base: 'rounded px-1 text-2xs font-medium tabular-nums',
  variants: {
    isSelected: {
      true: 'bg-accent-subtle text-accent',
      false: 'bg-emphasis/70 text-muted',
    },
  },
});

export const JournalProblemsBar = memo(function JournalProblemsBar({
  isProblemsOnly,
  onModeChange,
  problemTotal,
  problemStats,
  find,
  onFindChange,
  matchCount,
  navigableTotal,
  announcement,
  checkProgress,
  checkLimit,
  onPrevious,
  onNext,
}: JournalProblemsBarProps) {
  const inputRef = useFocusShortcut<HTMLInputElement>();
  const [ref, maxWidth] = useWidthBeforeTimeline();
  const {
    base,
    group,
    divider,
    arrow,
    field,
    searchIcon,
    input,
    shortcut,
    matches,
    clear,
  } = modeStyles();
  const search = (
    <SearchField
      aria-label="Find entries"
      value={find}
      onChange={onFindChange}
      enterKeyHint="search"
      className={field()}
    >
      <Label className="sr-only">Find entries</Label>
      <Icon name={IconName.Search} className={searchIcon()} />
      <AriaInput
        ref={inputRef}
        placeholder="Find text or type…"
        className={input()}
      />
      {find ? (
        <>
          {matchCount !== undefined && (
            <span className={matches()}>{formatNumber(matchCount)}</span>
          )}
          <Button
            type="button"
            variant="icon"
            aria-label="Clear search"
            className={clear()}
            onClick={() => onFindChange('')}
          >
            <Icon name={IconName.X} size="sm" />
          </Button>
        </>
      ) : (
        <FocusShortcutKey variant="light" className={shortcut()} />
      )}
    </SearchField>
  );
  return (
    <div className={base()} ref={ref} style={{ maxWidth }}>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <div className={group()}>
        <Button
          variant="icon"
          className={modeSegmentStyles({ isSelected: !isProblemsOnly })}
          onClick={() => onModeChange(false)}
          aria-pressed={!isProblemsOnly}
        >
          All entries
        </Button>
        <HoverTooltip
          content={
            <ProblemsSummary
              stats={problemStats}
              checkProgress={checkProgress}
              checkLimit={checkLimit}
            />
          }
          placement="top"
        >
          <Button
            variant="icon"
            className={modeSegmentStyles({ isSelected: isProblemsOnly })}
            onClick={() => onModeChange(true)}
            aria-pressed={isProblemsOnly}
          >
            Problems
            <span className={modeCountStyles({ isSelected: isProblemsOnly })}>
              {formatNumber(problemTotal)}
              {checkLimit ? '+' : ''}
            </span>
            {checkProgress?.failure ? (
              <>
                <Icon
                  name={IconName.TriangleAlert}
                  size="2xs"
                  className="text-warning-subtle"
                />
                <span className="sr-only">Child check incomplete</span>
              </>
            ) : (
              checkProgress && <Spinner size="xs" className="text-muted" />
            )}
          </Button>
        </HoverTooltip>
        {problemTotal > 0 && (
          <>
            <span aria-hidden className={divider()} />
            <ProblemStepButtons
              onPrevious={onPrevious}
              onNext={onNext}
              buttonClassName={arrow()}
              isDisabled={navigableTotal === 0}
            />
          </>
        )}
      </div>
      {search}
    </div>
  );
});

const summaryMarkStyles = tv({
  base: 'h-1.5 w-1.5 shrink-0 rounded-full',
  variants: {
    tone: {
      danger: 'bg-danger-strong',
      warning: 'bg-warning-strong',
      neutral: 'bg-neutral',
      info: 'bg-info-strong',
    },
  },
});

function ProblemsSummary({
  stats,
  checkProgress,
  checkLimit,
}: {
  stats: ProblemStats;
  checkProgress?: JournalProblemsBarProps['checkProgress'];
  checkLimit?: JournalProblemsBarProps['checkLimit'];
}) {
  const lines = [
    {
      count: stats.failed,
      one: 'failed step',
      many: 'failed steps',
      tone: 'danger',
    },
    {
      count: stats.failedChildren,
      one: 'failed child',
      many: 'failed children',
      tone: 'danger',
    },
    {
      count: stats.backingOffChildren,
      one: 'child backing off',
      many: 'children backing off',
      tone: 'warning',
    },
    {
      count: stats.pausedChildren,
      one: 'paused child',
      many: 'paused children',
      tone: 'warning',
    },
    {
      count: stats.retrying,
      one: 'step retrying',
      many: 'steps retrying',
      tone: 'warning',
    },
    {
      count: stats.paused,
      one: 'paused step',
      many: 'paused steps',
      tone: 'warning',
    },
    {
      count: stats.recovered,
      one: 'recovered step',
      many: 'recovered steps',
      tone: 'neutral',
    },
    {
      count: stats.waiting,
      one: 'waiting, not counted',
      many: 'waiting, not counted',
      tone: 'info',
    },
  ] as const;
  const shown = lines.filter(({ count }) => count > 0);
  const note =
    checkProgress?.failure === 'stale'
      ? "Couldn't refresh some child invocations"
      : checkProgress?.failure
        ? "Some child invocations aren't checked yet, trying again"
        : checkProgress
          ? 'Still looking for problems in child invocations'
          : checkLimit
            ? `Click to check all ${formatNumber(checkLimit.total)} children`
            : undefined;
  return (
    <span className="grid grid-cols-[auto_auto_1fr] items-center gap-x-2 gap-y-1 break-normal">
      {shown.length === 0 && !stats.stuckInputStatus && (
        <span className="col-span-3">
          No failed steps, retries or children in trouble
        </span>
      )}
      {shown.map(({ count, one, many, tone }) => (
        <Fragment key={one}>
          <span aria-hidden className={summaryMarkStyles({ tone })} />
          <span className="text-right tabular-nums">{formatNumber(count)}</span>
          <span className="whitespace-nowrap">{count === 1 ? one : many}</span>
        </Fragment>
      ))}
      {stats.stuckInputStatus && (
        <>
          <span
            aria-hidden
            className={summaryMarkStyles({ tone: 'warning' })}
          />
          <span className="col-span-2 whitespace-nowrap">
            Invocation {stats.stuckInputStatus.replace('-', ' ')} after errors
          </span>
        </>
      )}
      {note && (
        <span className="col-span-3 whitespace-nowrap text-inverse-muted">
          {note}
        </span>
      )}
    </span>
  );
}

const TIMELINE_GAP_PX = 12;

function useWidthBeforeTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>();
  useEffect(() => {
    const element = ref.current;
    const timeline = document.querySelector<HTMLElement>(
      '[data-journal-timeline-start]',
    );
    if (!element || !timeline) {
      return;
    }
    const update = () => {
      const timelineRect = timeline.getBoundingClientRect();
      setMaxWidth(
        timelineRect.width === 0
          ? undefined
          : Math.max(
              0,
              Math.floor(
                timelineRect.left -
                  element.getBoundingClientRect().left -
                  TIMELINE_GAP_PX,
              ),
            ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(timeline);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  return [ref, maxWidth] as const;
}

function ProblemStepButtons({
  onPrevious,
  onNext,
  buttonClassName,
  isDisabled = false,
}: Pick<JournalProblemsBarProps, 'onPrevious' | 'onNext'> & {
  buttonClassName: string;
  isDisabled?: boolean;
}) {
  return (
    <>
      <HoverTooltip content="Previous problem">
        <Button
          variant="icon"
          className={buttonClassName}
          onClick={onPrevious}
          disabled={isDisabled}
          aria-label="Previous problem"
        >
          <Icon name={IconName.ChevronUp} size="sm" />
        </Button>
      </HoverTooltip>
      <HoverTooltip content="Next problem">
        <Button
          variant="icon"
          className={buttonClassName}
          onClick={onNext}
          disabled={isDisabled}
          aria-label="Next problem"
        >
          <Icon name={IconName.ChevronDown} size="sm" />
        </Button>
      </HoverTooltip>
    </>
  );
}
