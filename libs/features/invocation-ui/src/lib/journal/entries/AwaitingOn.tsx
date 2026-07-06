import type {
  InvocationFuture,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { DropdownSection } from '@restate/ui/dropdown';
import { Spinner } from '@restate/ui/loading';
import { Entry } from '../Entry';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { tv } from '@restate/util/styles';
import {
  JournalEntriesContext,
  useJournalEntriesContext,
} from '../JournalContext';
import { useMemo } from 'react';
import { formatPlurals } from '@restate/util/intl';

type Invocation = ReturnType<
  typeof useGetInvocationJournalWithInvocationV2
>['data'];

const FUTURE_GROUP_KEYS = [
  'Attempt',
  'FirstCompleted',
  'AllCompleted',
  'FirstSucceededOrAllFailed',
  'AllSucceededOrFirstFailed',
  'Unknown',
] as const;

type FutureGroupKey = (typeof FUTURE_GROUP_KEYS)[number];

const GROUP_LABELS: Record<FutureGroupKey, string> = {
  Attempt: 'attempt',
  FirstCompleted: 'first completed',
  AllCompleted: 'all completed',
  FirstSucceededOrAllFailed: 'first succeeded or all failed',
  AllSucceededOrFirstFailed: 'all succeeded or first failed',
  Unknown: 'unknown',
};

function getFutureGroup(
  future: InvocationFuture,
): { type: FutureGroupKey; children: InvocationFuture[] } | undefined {
  const record = future as Partial<Record<FutureGroupKey, unknown>>;
  for (const type of FUTURE_GROUP_KEYS) {
    const children = record[type];
    if (Array.isArray(children)) {
      return { type, children: children as InvocationFuture[] };
    }
  }
  return undefined;
}

type SingleRef = {
  CompletionId?: number;
  SignalIndex?: number;
  SignalName?: string;
};

function getSingleRef(future: InvocationFuture): SingleRef | undefined {
  const single = (future as { Single?: unknown }).Single;
  if (!single || typeof single !== 'object') {
    return undefined;
  }
  return single as SingleRef;
}

function countFutureLeaves(future: InvocationFuture): number {
  const group = getFutureGroup(future);
  if (group) {
    return group.children.reduce(
      (acc, child) => acc + countFutureLeaves(child),
      0,
    );
  }
  return getSingleRef(future) ? 1 : 0;
}

// The runtime wraps the user's awaitable in an implicit FirstCompleted with a
// cancellation signal (SignalIndex 1) so cancellation can preempt it. That
// wrapper is plumbing, not user-facing intent — strip it from the tree.
// TODO: surface the cancel pathway as an explicit "can be cancelled" affordance
// elsewhere in the UI instead of silently hiding it here.
function unwrapCancelWrapper(future: InvocationFuture): InvocationFuture[] {
  const group = getFutureGroup(future);
  if (group?.type !== 'FirstCompleted') return [future];

  const hasCancel = group.children.some(
    (child) => getSingleRef(child)?.SignalIndex === 1,
  );
  if (!hasCancel) return [future];

  return group.children.filter(
    (child) => getSingleRef(child)?.SignalIndex !== 1,
  );
}

function findEntryForRef(
  ref: SingleRef,
  entries: JournalEntryV2[] | undefined,
): JournalEntryV2 | undefined {
  if (!entries) return undefined;
  if (typeof ref.CompletionId === 'number') {
    return entries.find((e) => e.completionId === ref.CompletionId);
  }
  if (typeof ref.SignalIndex === 'number') {
    if (ref.SignalIndex === 1) {
      return entries.find(
        (e) => e.category === 'notification' && e.type === 'Cancel',
      );
    }
    return entries.find(
      (e) =>
        e.category === 'notification' &&
        e.type === 'CompleteAwakeable' &&
        (e as { signalIndex?: number }).signalIndex === ref.SignalIndex,
    );
  }
  // SignalName refs are NOT looked up in the journal — the wire protocol gives
  // us only the name, so we can't disambiguate when multiple signals share it
  // (positional matching depends on the runtime's consumption pointer, which
  // we don't see). Synthesized inline in FutureNode instead.
  return undefined;
}

// Builds a minimal Signal notification entry for a SignalName ref so we can
// render it via <Entry> without picking a (possibly wrong) journal row. The
// `isPending` flag matches the lifecycle entry's: a live (invocation-sourced)
// future has outstanding awaits; a historical (event-sourced) future is a
// past snapshot whose live state we don't know.
function synthesizeSignalEntry(
  signalName: string,
  isPending: boolean,
): JournalEntryV2 {
  return {
    category: 'notification',
    type: 'Signal',
    signalName,
    isPending,
    isAwaitingOn: true,
    isLoaded: true,
  } as JournalEntryV2;
}

function fallbackLabel(ref: SingleRef): string {
  if (ref.CompletionId !== undefined) return `completion #${ref.CompletionId}`;
  if (ref.SignalIndex === 1) return 'cancel';
  if (ref.SignalIndex !== undefined) return `signal #${ref.SignalIndex}`;
  if (ref.SignalName !== undefined) return `signal "${ref.SignalName}"`;
  return '';
}

function FutureNode({
  future,
  invocation,
  isPending,
}: {
  future: InvocationFuture;
  invocation: Invocation;
  isPending: boolean;
}) {
  const group = getFutureGroup(future);
  if (group) {
    return (
      <>
        <div className="pl-2 font-mono text-xs font-medium text-zinc-400">
          {GROUP_LABELS[group.type]}
        </div>
        <div className="ml-2 flex flex-col gap-0.5 border-l border-zinc-200 pl-1">
          {group.children.map((child, i) => (
            <FutureNode
              key={i}
              future={child}
              invocation={invocation}
              isPending={isPending}
            />
          ))}
        </div>
      </>
    );
  }

  const single = getSingleRef(future);
  const entry = single?.SignalName
    ? synthesizeSignalEntry(single.SignalName, isPending)
    : single
      ? findEntryForRef(single, invocation?.journal?.entries)
      : undefined;

  if (!entry) {
    return (
      <div className="font-mono text-2xs text-zinc-500">
        {single && fallbackLabel(single)}
      </div>
    );
  }

  return <Entry entry={entry} invocation={invocation} depth={0} />;
}

const triggerStyles = tv({
  base: 'flex h-5 items-center gap-1 truncate rounded-md bg-white/70 px-1.5 py-0.5 text-2xs font-normal',
  variants: {
    state: {
      suspended: 'text-zinc-700',
      running: 'text-blue-700',
    },
  },
});

export type AwaitingOnState = 'suspended' | 'running';

// Rendered inside the popover body. The journal query only fires when the
// popover is open (PopoverContent isn't mounted otherwise), and with
// `refetchOnMount: false` it just reads from the shared cache when the parent
// timeline has already loaded the journal.
function AwaitingOnContent({
  roots,
  invocationId,
  isPending,
}: {
  roots: InvocationFuture[];
  invocationId: string;
  isPending: boolean;
}) {
  const { data, isPending: isLoading } =
    useGetInvocationJournalWithInvocationV2(invocationId, {
      refetchOnMount: true,
    });
  const parentContext = useJournalEntriesContext();
  const readOnlyContext = useMemo(
    () => ({
      ...parentContext,
      disableExpand: true,
      hideOutput: true,
      disableAwaitingHighlight: true,
    }),
    [parentContext],
  );

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-1.5 p-2 text-2xs text-zinc-500">
        <Spinner className="h-3 w-3" />
        Loading…
      </div>
    );
  }

  return (
    <JournalEntriesContext.Provider value={readOnlyContext}>
      <div className="flex flex-col gap-0.5 p-2">
        {roots.map((root, i) => (
          <FutureNode
            key={i}
            future={root}
            invocation={data}
            isPending={isPending}
          />
        ))}
      </div>
    </JournalEntriesContext.Provider>
  );
}

export function AwaitingOn({
  future,
  invocationId,
  state = 'running',
  isPending,
  className,
}: {
  future?: InvocationFuture;
  invocationId: string;
  state?: AwaitingOnState;
  isPending: boolean;
  className?: string;
}) {
  if (!future) return null;
  const roots = unwrapCancelWrapper(future);
  const count = roots.reduce((acc, root) => acc + countFutureLeaves(root), 0);
  const countLabel = `${count} ${formatPlurals(count, { one: 'entry', other: 'entries' })}`;
  const label = isPending ? `awaiting ${countLabel}` : `awaited ${countLabel}`;
  const title = isPending ? `Awaiting ${countLabel}` : `Awaited ${countLabel}`;
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className={triggerStyles({ state, className })}
        >
          {label}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 shrink-0 text-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-2xl">
        <DropdownSection
          title={title}
          className="overflow-hidden rounded-2xl bg-gray-50 *:text-xs"
        >
          <AwaitingOnContent
            roots={roots}
            invocationId={invocationId}
            isPending={isPending}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
