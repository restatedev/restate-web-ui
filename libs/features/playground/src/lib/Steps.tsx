import { useEffect, useState } from 'react';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access-admin-api-hooks';
import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { formatMilliseconds } from '@restate/util-intl';
import { tv } from '@restate/util-styles';

const HIDDEN_TYPES = new Set(['Input', 'Output']);
const POLL_INTERVAL_MS = 1000;
const POLL_LIMIT_MS = 5 * 60 * 1000;
const FINISHED = new Set(['succeeded', 'failed', 'cancelled', 'killed']);

function stepLabel(entry: JournalEntryV2) {
  if (entry.name) return entry.name;
  switch (entry.type) {
    case 'Sleep':
      return 'Sleep';
    case 'GetState':
    case 'GetEagerState':
      return 'Read state';
    case 'SetState':
      return 'Write state';
    case 'Call':
      return 'Call another handler';
    case 'OneWayCall':
      return 'Send to another handler';
    default:
      return entry.type ?? 'Step';
  }
}

function stepDuration(entry: JournalEntryV2) {
  if (!entry.start || !entry.end) return undefined;
  const ms = Date.parse(entry.end) - Date.parse(entry.start);
  return Number.isFinite(ms) && ms >= 0 ? formatMilliseconds(ms) : undefined;
}

const stepIconStyles = tv({
  base: 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
  variants: {
    state: {
      done: 'bg-success-subtle text-success-strong',
      pending: 'text-info',
      failed: 'bg-danger-subtle text-danger-strong',
      retrying: 'bg-warning-subtle text-warning-strong',
    },
  },
});

function StepIcon({ entry }: { entry: JournalEntryV2 }) {
  const state = entry.isRetrying
    ? 'retrying'
    : entry.resultType === 'failure'
      ? 'failed'
      : entry.isPending
        ? 'pending'
        : 'done';
  return (
    <span className={stepIconStyles({ state })}>
      {state === 'pending' ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <Icon
          name={
            state === 'done'
              ? IconName.Check
              : state === 'failed'
                ? IconName.X
                : IconName.Retry
          }
          className="h-2.5 w-2.5"
        />
      )}
    </span>
  );
}

export function Steps({
  invocationId,
  isDone,
  isLive,
  note,
}: {
  invocationId: string;
  isDone: boolean;
  isLive: boolean;
  note?: string;
}) {
  const [startedAt] = useState(() => Date.now());
  const { data, refetch } = useGetInvocationJournalWithInvocationV2(
    invocationId,
    {
      refetchInterval: (query) =>
        isLive &&
        !isDone &&
        !FINISHED.has(query.state.data?.status ?? '') &&
        Date.now() - startedAt < POLL_LIMIT_MS
          ? POLL_INTERVAL_MS
          : false,
    },
  );
  useEffect(() => {
    if (isDone) {
      void refetch();
    }
  }, [isDone, refetch]);
  const entries = (data?.journal?.entries ?? []).filter(
    (entry) =>
      entry.category === 'command' && !HIDDEN_TYPES.has(entry.type ?? ''),
  );

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted">
        {note ??
          (isDone ? 'No steps recorded.' : 'Waiting for the first step…')}
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-1.5 border-l border-muted pl-3">
      {entries.map((entry) => (
        <li
          key={entry.index}
          className="flex min-w-0 items-center gap-2 text-0.5xs"
        >
          <StepIcon entry={entry} />
          <span className="min-w-0 flex-auto truncate text-secondary">
            {stepLabel(entry)}
          </span>
          {entry.error?.message ? (
            <span className="min-w-0 truncate text-2xs text-danger">
              {entry.error.message}
            </span>
          ) : (
            <span className="shrink-0 text-2xs text-subtle tabular-nums">
              {stepDuration(entry)}
            </span>
          )}
        </li>
      ))}
      {!isDone && note && <li className="text-xs text-muted">{note}</li>}
    </ol>
  );
}
