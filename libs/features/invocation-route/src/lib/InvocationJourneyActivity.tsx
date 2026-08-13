import {
  COMPACT_DETAIL,
  Entry,
  JournalEntriesContext,
} from '@restate/features/invocation-ui';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { Fragment } from 'react';
import type {
  JourneyActivityCounts,
  JourneyActivityDetailGroup,
  JourneyActivityKind,
} from './InvocationJourneyModel';

const ACTIVITY_KINDS: Array<{
  key: JourneyActivityKind;
  label: string;
  singular: string;
  plural: string;
}> = [
  {
    key: 'errorBackoffs',
    label: 'Back-offs',
    singular: 'back-off',
    plural: 'back-offs',
  },
  { key: 'yields', label: 'Yields', singular: 'yield', plural: 'yields' },
  { key: 'pauses', label: 'Pauses', singular: 'pause', plural: 'pauses' },
  {
    key: 'suspensions',
    label: 'Suspensions',
    singular: 'suspension',
    plural: 'suspensions',
  },
];

const activityGroupStyles = tv({
  base: 'inline-flex h-5 items-center gap-1 rounded-md border py-0 pr-px pl-1.5 text-2xs font-medium',
  variants: {
    kind: {
      errorBackoffs:
        'border-dashed border-orange-300/60 bg-transparent text-orange-700/80',
      yields:
        'border-dashed border-zinc-300/70 bg-transparent text-zinc-500/90',
      pauses: 'border-orange-200/60 bg-orange-50/30 text-orange-700/80',
      suspensions: 'border-zinc-300/70 bg-zinc-100/50 text-zinc-500',
    },
    countFirst: {
      true: 'pr-1.5 pl-px',
    },
  },
});

const activityButtonStyles = tv({
  base: 'inline-flex h-4 items-center gap-0.5 rounded-sm border border-zinc-300/70 bg-white py-0 pr-0.5 pl-1 text-2xs leading-none font-medium tabular-nums shadow-xs hover:border-zinc-400/70 hover:bg-white pressed:bg-zinc-50',
  variants: {
    kind: {
      errorBackoffs: 'text-orange-800',
      yields: 'text-zinc-600',
      pauses: 'text-orange-800',
      suspensions: 'text-zinc-600',
    },
  },
});

const activityCountStyles = tv({
  base: 'inline-flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-sm border border-zinc-600/5 bg-white/70 px-1 text-2xs leading-none font-medium tabular-nums',
  variants: {
    kind: {
      errorBackoffs: 'text-orange-800',
      yields: 'text-zinc-600',
      pauses: 'text-orange-800',
      suspensions: 'text-zinc-600',
    },
  },
});

const activityRowsStyles = tv({
  base: 'min-w-0',
  variants: {
    inline: {
      true: '',
      false: 'py-2.5 pl-5',
    },
  },
  defaultVariants: {
    inline: false,
  },
});

export function journeyCountLabel(
  value: number,
  singular: string,
  plural: string,
) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function ActivityJournalRows({
  details,
}: {
  details: JourneyActivityDetailGroup;
}) {
  const invocation = details.invocation;
  const journalContext = {
    invocationIds: invocation ? [String(invocation.id)] : [],
    detail: { ...COMPACT_DETAIL, errors: true, lifecycle: true },
    disableExpand: true,
    hideOutput: true,
    disableAwaitingHighlight: true,
  };

  return (
    <JournalEntriesContext.Provider value={journalContext}>
      <div className="overflow-hidden py-1 text-xs">
        {invocation &&
          details.items.map((detail) => (
            <Entry
              key={detail.key}
              entry={detail.entry}
              parentCommand={detail.parentCommand}
              invocation={invocation}
              depth={0}
              compact
              showEventTime
            />
          ))}
      </div>
    </JournalEntriesContext.Provider>
  );
}

function ActivityHistoryButton({
  kind,
  count,
  label,
  visibleLabel,
  plural,
  details,
  displayCount,
  accessibleCount,
  countFirst = false,
  popoverTitle,
  accessibleLabel,
}: {
  kind: JourneyActivityKind;
  count: number;
  label: string;
  visibleLabel?: string;
  plural: string;
  details?: JourneyActivityDetailGroup;
  displayCount?: string;
  accessibleCount?: string;
  countFirst?: boolean;
  popoverTitle?: string;
  accessibleLabel?: string;
}) {
  const visibleCount = displayCount ?? formatNumber(count, true);
  const announcedCount = accessibleCount ?? formatNumber(count);
  const announcedLabel = accessibleLabel ?? label;
  const historyTitle = popoverTitle ?? label;
  const emptyMessage =
    details?.emptyMessage ??
    (kind === 'errorBackoffs'
      ? 'No retained transient-error details are available.'
      : kind === 'suspensions'
        ? 'Waiting-entry details are available for protocol v7 invocations.'
        : `No retained ${plural} are available.`);

  if (kind === 'yields') {
    const countElement = (
      <span
        aria-label={`${label}: ${announcedCount}`}
        className={activityCountStyles({ kind })}
      >
        {visibleCount}
      </span>
    );

    return (
      <span className={activityGroupStyles({ kind, countFirst })}>
        {countFirst ? (
          <>
            {countElement} <span>{visibleLabel ?? label}</span>
          </>
        ) : (
          <>
            <span>{visibleLabel ?? label}</span> {countElement}
          </>
        )}
      </span>
    );
  }

  const history = (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          aria-label={`${announcedLabel}: ${announcedCount}`}
          className={activityButtonStyles({ kind })}
        >
          <span>{visibleCount}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-2.5 w-2.5 shrink-0 text-gray-500 opacity-70"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(36rem,calc(100vw-2rem))]">
        <DropdownSection
          title={
            <span className="inline-flex items-center gap-1.5">
              <span>{historyTitle}</span>
              <span className={activityCountStyles({ kind })}>
                {displayCount ?? formatNumber(count)}
              </span>
            </span>
          }
          className="max-h-80 overflow-y-auto"
        >
          {details?.summary && (
            <p className="border-b border-gray-100 px-3 py-2 text-2xs leading-4 text-gray-500">
              {details.summary}
            </p>
          )}
          {details?.items.length ? (
            <ActivityJournalRows details={details} />
          ) : (
            <p className="px-3 py-3 text-xs text-gray-400">{emptyMessage}</p>
          )}
          {details && details.totalItems > details.items.length && (
            <p className="border-t border-gray-100 px-3 py-2 text-2xs text-gray-400">
              Showing the latest {formatNumber(details.items.length)} of{' '}
              {formatNumber(details.totalItems)} {details.itemNoun ?? 'events'}.
            </p>
          )}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );

  return (
    <span className={activityGroupStyles({ kind, countFirst })}>
      {countFirst ? (
        <>
          {history} <span>{visibleLabel ?? label}</span>
        </>
      ) : (
        <>
          <span>{visibleLabel ?? label}</span> {history}
        </>
      )}
    </span>
  );
}

function ActivityCount({
  kind,
  count,
  label,
  visibleLabel,
  countFirst = false,
}: {
  kind: JourneyActivityKind;
  count: number;
  label: string;
  visibleLabel?: string;
  countFirst?: boolean;
}) {
  const countElement = (
    <span
      aria-label={`${label}: ${formatNumber(count)}`}
      className={activityCountStyles({ kind })}
    >
      {formatNumber(count, true)}
    </span>
  );

  return (
    <span className={activityGroupStyles({ kind, countFirst })}>
      {countFirst ? (
        <>
          {countElement} <span>{visibleLabel ?? label}</span>
        </>
      ) : (
        <>
          <span>{visibleLabel ?? label}</span> {countElement}
        </>
      )}
    </span>
  );
}

function RetryActivityBranch({
  retries,
  backoffs,
  details,
  countFirst = false,
}: {
  retries: number;
  backoffs: number;
  details?: JourneyActivityDetailGroup;
  countFirst?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {retries > 0 && (
        <ActivityHistoryButton
          kind="errorBackoffs"
          count={retries}
          label="Retries"
          visibleLabel={retries === 1 ? 'retry' : 'retries'}
          plural="retries"
          details={details}
          countFirst={countFirst}
          popoverTitle="Transient errors"
        />
      )}
      {!countFirst && retries > 0 && backoffs > 0 && (
        <span aria-hidden="true" className="text-gray-300">
          ·
        </span>
      )}
      {backoffs > 0 && (
        <ActivityCount
          kind="errorBackoffs"
          count={backoffs}
          label="Back-offs"
          visibleLabel={backoffs === 1 ? 'back-off' : 'back-offs'}
          countFirst={countFirst}
        />
      )}
    </div>
  );
}

export function hasJourneyActivity(
  activity: JourneyActivityCounts,
  retryAttempts = 0,
) {
  return (
    ACTIVITY_KINDS.some(({ key }) => activity[key] > 0) || retryAttempts > 0
  );
}

export function JourneyActivityRows({
  activity,
  details,
  retryAttempts = 0,
  currentAttemptActive = false,
  inline = false,
}: {
  activity: JourneyActivityCounts;
  details?: Partial<Record<JourneyActivityKind, JourneyActivityDetailGroup>>;
  retryAttempts?: number;
  currentAttemptActive?: boolean;
  inline?: boolean;
}) {
  const visible = ACTIVITY_KINDS.filter(
    ({ key }) => key !== 'errorBackoffs' && activity[key] > 0,
  );
  const errorBackoffs = activity.errorBackoffs;
  const visibleRetries =
    !currentAttemptActive && retryAttempts > 0 ? retryAttempts : 0;
  const hasRetryActivity = visibleRetries > 0 || errorBackoffs > 0;
  if (!hasRetryActivity && visible.length === 0) return null;
  const retryActivityLabel = [
    visibleRetries > 0
      ? journeyCountLabel(visibleRetries, 'retry', 'retries')
      : undefined,
    errorBackoffs > 0
      ? journeyCountLabel(errorBackoffs, 'back-off', 'back-offs')
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={activityRowsStyles({ inline })}>
      <div
        role="list"
        aria-label="Lifecycle activity"
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {hasRetryActivity && (
          <div
            role="listitem"
            aria-label={`Retry activity: ${retryActivityLabel}`}
          >
            <RetryActivityBranch
              retries={visibleRetries}
              backoffs={errorBackoffs}
              details={details?.errorBackoffs}
              countFirst={inline}
            />
          </div>
        )}
        {visible.map(({ key, label, singular, plural }, index) => (
          <Fragment key={key}>
            {!inline && (hasRetryActivity || index > 0) && (
              <span aria-hidden="true" className="self-center text-gray-300">
                ·
              </span>
            )}
            <div
              role="listitem"
              aria-label={`${label}: ${journeyCountLabel(
                activity[key],
                singular,
                plural,
              )}`}
            >
              <ActivityHistoryButton
                kind={key}
                count={activity[key]}
                label={label}
                visibleLabel={
                  inline ? (activity[key] === 1 ? singular : plural) : undefined
                }
                plural={plural}
                details={details?.[key]}
                countFirst={inline}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
