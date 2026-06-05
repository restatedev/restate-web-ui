import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps, EventEntryType } from './types';
import {
  ENTRY_EVENTS_ENTRY_LABELS,
  ENTRY_EVENTS_TITLES,
} from '../EntryTooltip';
import { PhaseDuration, RelativeTime } from './RelativeTime';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { ENTRY_COMMANDS_COMPONENTS } from '../Entry';
import { ComponentType } from 'react';
import { EntryCodecProvider } from './EntryCodecProvider';
import { AwaitingOn } from './AwaitingOn';
import { InvocationId } from '../InvocationId';
import {
  RESTARTED_FROM_HEADER,
  useGetInvocationJournalWithInvocationV2,
  useGetJournalEntryPayloads,
  useListSubscriptions,
} from '@restate/data-access/admin-api-hooks';
import { tv } from '@restate/util/styles';

type Invocation = ReturnType<
  typeof useGetInvocationJournalWithInvocationV2
>['data'];

// Per-row config for the subtle relative time. `connector` is the leading word
// when the label doesn't already supply one (e.g. "Running" → "since"); Created
// ("Created at"), Killed ("Killed at") and Retrying ("Next retry") read fine
// without one. `useEnd` surfaces the entry's end instead of start — Scheduled
// shows the run time so a pending schedule reads "in <duration>".
// `durationWhenEnded` flips Running/Pending to the phase's length ("for
// <duration>") once it's no longer live, since "since … ago" would otherwise
// read as if the phase were still ongoing.
const LIFECYCLE_TIME: Partial<
  Record<
    EventEntryType,
    { connector?: string; useEnd?: boolean; durationWhenEnded?: boolean }
  >
> = {
  Created: {},
  Running: { connector: 'since', durationWhenEnded: true },
  Pending: { connector: 'since', durationWhenEnded: true },
  Scheduled: { useEnd: true },
  Suspended: { connector: 'at' },
  Paused: { connector: 'at' },
  Retrying: {},
  Killed: {},
};

export function LifeCycle({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Killed'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>
>) {
  if (entry.type === 'Created') {
    return <CreatedSource invocation={invocation} />;
  }

  const isPaused = entry.type === 'Paused';

  if (isPaused) {
    const commandIndex = entry.relatedCommandIndex;
    const parentCommand =
      typeof commandIndex === 'number'
        ? invocation?.journal?.entries?.find(
            (e) => e.category === 'command' && e.commandIndex === commandIndex,
          )
        : undefined;
    const CommandComponent = parentCommand?.type
      ? (ENTRY_COMMANDS_COMPONENTS[
          parentCommand.type as keyof typeof ENTRY_COMMANDS_COMPONENTS
        ] as ComponentType<EntryProps<JournalEntryV2>> | undefined)
      : undefined;

    const hasError = Boolean(entry.code || entry.message || entry.error);
    return (
      <div className="-order-1 mr-2 flex items-center gap-2 font-sans text-zinc-500">
        <span className="shrink-0">
          {hasError ? ENTRY_EVENTS_ENTRY_LABELS['Paused'] : 'Paused'}
        </span>
        {hasError && (
          <Badge
            variant="warning"
            size="sm"
            className="gap-0 truncate px-0 font-sans font-normal"
          >
            {parentCommand && typeof commandIndex === 'number' && (
              <Popover>
                <PopoverTrigger>
                  <Button
                    className="-my-1 translate-x-[-0.5px] rounded-md px-1 py-0 font-mono text-xs text-gray-400"
                    variant="secondary"
                  >
                    <div className="flex h-5 items-center">#{commandIndex}</div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <DropdownSection
                    className="relative px-3 py-2 pr-8 text-0.5xs"
                    title={
                      <span className="text-2xs text-gray-400 uppercase">{`Command #${commandIndex}`}</span>
                    }
                  >
                    {CommandComponent && (
                      <EntryCodecProvider
                        entry={parentCommand}
                        invocation={invocation}
                      >
                        <CommandComponent
                          entry={parentCommand}
                          invocation={invocation}
                        />
                      </EntryCodecProvider>
                    )}
                  </DropdownSection>
                </PopoverContent>
              </Popover>
            )}
            <Failure
              title="Paused after"
              restate_code={String(
                entry.relatedRestateErrorCode ||
                  entry.code ||
                  entry?.error?.restateCode ||
                  entry?.error?.code ||
                  '',
              )}
              stacktrace={entry?.stack || entry?.error?.stack}
              message={[entry.message, entry?.error?.message]
                .filter(Boolean)
                .join('\n\n')}
              isRetrying
              className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
            />
          </Badge>
        )}
        <RelativeTime
          date={entry.start}
          tooltipTitle={ENTRY_EVENTS_TITLES['Paused']}
          connector={hasError ? undefined : 'at'}
        />
      </div>
    );
  }
  const supportsAwaitingOn =
    entry.type === 'Suspended' ||
    entry.type === 'Running' ||
    entry.type === 'Retrying';
  const awaitingOn = supportsAwaitingOn ? entry.awaitingOn : undefined;
  const awaitingState = entry.type === 'Suspended' ? 'suspended' : 'running';

  const timeConfig = LIFECYCLE_TIME[entry.type as EventEntryType] ?? {};
  const date = timeConfig.useEnd ? entry.end : entry.start;
  const showDuration =
    Boolean(timeConfig.durationWhenEnded) &&
    !entry.isPending &&
    Boolean(entry.end);

  return (
    <div className="mr-2 flex items-baseline gap-[0.5ch] font-sans text-zinc-500">
      <span className="shrink-0">
        {{ ...ENTRY_EVENTS_ENTRY_LABELS }[String(entry.type)]}
      </span>
      {showDuration ? (
        <PhaseDuration
          start={entry.start}
          end={entry.end}
          tooltipTitle={ENTRY_EVENTS_TITLES[entry.type as EventEntryType]}
        />
      ) : (
        <RelativeTime
          date={date}
          tooltipTitle={ENTRY_EVENTS_TITLES[entry.type as EventEntryType]}
          connector={timeConfig.connector}
        />
      )}
      {invocation?.id && (
        <AwaitingOn
          future={awaitingOn}
          invocationId={String(invocation.id)}
          state={awaitingState}
          isPending={Boolean(entry.isPending)}
        />
      )}
    </div>
  );
}

const invocationIdStyles = tv({
  base: 'max-w-[20ch] min-w-0 text-xs font-semibold',
});

function CreatedSource({ invocation }: { invocation?: Invocation }) {
  // Journal lite doesn't include the Input entry's full headers, so reach for
  // the payload endpoint to check for the restart marker header. Reuses cache
  // across re-mounts; the same query is shared with the Input popover.
  const { data: inputPayload } = useGetJournalEntryPayloads(
    String(invocation?.id),
    0,
    { enabled: Boolean(invocation?.id), refetchOnMount: false },
  );

  if (!invocation) {
    return (
      <div className="mr-2 flex items-center gap-2 font-sans text-zinc-500">
        <span className="shrink-0">{ENTRY_EVENTS_ENTRY_LABELS['Created']}</span>
      </div>
    );
  }

  const inputEntry = invocation.journal?.entries?.find(
    (e) => e.category === 'command' && e.type === 'Input',
  ) as
    | Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>
    | undefined;
  const restartedFromHeader = (
    inputPayload?.headers || inputEntry?.headers
  )?.find(({ key }) => key === RESTARTED_FROM_HEADER);
  const isRestartedFrom = Boolean(
    invocation.invoked_by === 'restart_as_new' || restartedFromHeader,
  );
  const restartedFromValue =
    invocation.restarted_from || restartedFromHeader?.value;

  return (
    <div className="mr-2 flex items-center gap-2 font-sans text-zinc-500">
      {isRestartedFrom ? (
        <>
          <span className="shrink-0">Restarted from</span>
          {restartedFromValue && (
            <InvocationId
              id={restartedFromValue}
              className={invocationIdStyles()}
            />
          )}
        </>
      ) : invocation.invoked_by === 'subscription' ? (
        <CreatedBySubscription invocation={invocation} />
      ) : invocation.invoked_by_id ? (
        <>
          <span className="shrink-0">Invoked by</span>
          <InvocationId
            id={invocation.invoked_by_id}
            className={invocationIdStyles()}
          />
        </>
      ) : (
        <span className="shrink-0">{ENTRY_EVENTS_ENTRY_LABELS['Created']}</span>
      )}
      <RelativeTime
        date={invocation.created_at}
        tooltipTitle={ENTRY_EVENTS_TITLES['Created']}
      />
    </div>
  );
}

function CreatedBySubscription({ invocation }: { invocation: Invocation }) {
  // Created is the only lifecycle entry sourced from invocation state, and it
  // exists once per invocation — but its row may re-mount across renders /
  // virtualization. `refetchOnMount: false` lets repeated mounts reuse the
  // shared TanStack cache instead of refetching.
  const { data } = useListSubscriptions({ refetchOnMount: false });
  const subscriptionId = invocation?.invoked_by_subscription_id;
  const source =
    data?.subscriptions?.find((s) => s.id === subscriptionId)?.source ??
    subscriptionId;

  return (
    <>
      <span className="shrink-0">Invoked by subscription</span>
      {source && <span className="truncate font-medium">{source}</span>}
    </>
  );
}
