import {
  JournalEntryV2,
  useGetInvocationJournalWithInvocationV2,
} from '@restate/data-access/admin-api';
import { ComponentType } from 'react';
import { AttachInvocation } from './entries/AttachInvocation';
import { Awakeable } from './entries/Awakeable';
import { Call } from './entries/Call';
import { CancelSignal } from './entries/CancelSignal';
import { ClearAllState } from './entries/ClearAllState';
import { ClearState } from './entries/ClearState';
import {
  CompleteAwakeable,
  CompleteAwakeableNotification,
} from './entries/CompleteAwakeable';
import { CompletePromise } from './entries/CompletePromise';
import { GetPromise } from './entries/GetPromise';
import { GetState } from './entries/GetState';
import { GetStateKeys } from './entries/GetStateKeys';
import { OneWayCall } from './entries/OneWayCall';
import { Output } from './entries/Output';
import { PeekPromise } from './entries/PeekPromise';
import { Run } from './entries/Run';
import { SetState } from './entries/SetState';
import { Sleep } from './entries/Sleep';
import {
  CommandEntryType,
  EntryProps,
  EventEntryType,
  NotificationEntryType,
} from './entries/types';
import { EntryProgress } from './EntryProgress';
import { getEntryId, TimelinePortal, usePortals } from './Portals';
import { RelatedEntries } from './RelatedEntries';
import { Cancel } from './entries/Cancel';
import { LifeCycle } from './entries/LifeCycle';
import { Link } from '@restate/ui/link';
import { NoCommandTransientError } from './entries/TransientError';

export const ENTRY_COMMANDS_COMPONENTS: {
  [K in CommandEntryType]:
    | ComponentType<
        EntryProps<Extract<JournalEntryV2, { type?: K; category?: 'command' }>>
      >
    | undefined;
} = {
  ClearState,
  OneWayCall,
  ClearAllState,
  GetState,
  GetEagerState: GetState,
  Call,
  SetState,
  Awakeable,
  Input: undefined,
  GetStateKeys,
  GetEagerStateKeys: GetStateKeys,
  Sleep,
  GetPromise,
  PeekPromise,
  CompletePromise,
  CompleteAwakeable,
  Run,
  AttachInvocation,
  Output,
  Cancel,
};
export const ENTRY_NOTIFICATIONS_COMPONENTS: {
  [K in NotificationEntryType]:
    | ComponentType<
        EntryProps<
          Extract<JournalEntryV2, { type?: K; category?: 'notification' }>
        >
      >
    | undefined;
} = {
  Call: undefined,
  Sleep: undefined,
  GetPromise: undefined,
  PeekPromise: undefined,
  CompletePromise: undefined,
  CompleteAwakeable: CompleteAwakeableNotification,
  Run: undefined,
  AttachInvocation: undefined,
  Cancel: CancelSignal,
  CallInvocationId: undefined,
};

export const ENTRY_EVENTS_COMPONENTS: {
  [K in EventEntryType]:
    | ComponentType<
        EntryProps<Extract<JournalEntryV2, { type?: K; category?: 'event' }>>
      >
    | undefined;
} = {
  TransientError: NoCommandTransientError,
  Created: LifeCycle,
  Running: LifeCycle,
  Suspended: LifeCycle,
  Pending: LifeCycle,
  Completion: undefined,
  Retrying: LifeCycle,
  Scheduled: LifeCycle,
};

function digitCount(n: number) {
  if (n === 0) return 1;
  return Math.floor(Math.log10(Math.abs(n))) + 1;
}

export function Entry({
  invocation,
  entry,
  depth,
}: {
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  entry?: JournalEntryV2;
  depth: number;
}) {
  const length =
    invocation?.journal_commands_size ?? invocation?.journal_size ?? 1;
  const numOfDigits = digitCount(length);

  const EntrySpecificComponent = (
    entry?.type
      ? entry.category === 'command'
        ? ENTRY_COMMANDS_COMPONENTS[entry.type as CommandEntryType]
        : entry.category === 'notification'
          ? ENTRY_NOTIFICATIONS_COMPONENTS[entry.type as NotificationEntryType]
          : ENTRY_EVENTS_COMPONENTS[entry.type as EventEntryType]
      : undefined
  ) as ComponentType<EntryProps<JournalEntryV2>> | undefined;

  const { setPortal } = usePortals(
    getEntryId(
      invocation?.id ?? '',
      entry?.index,
      entry?.type,
      entry?.category,
    ),
  );

  if (!invocation || !entry) {
    return null;
  }

  return (
    <>
      <div
        style={{
          paddingLeft: `${depth * 3}em`,
        }}
        data-depth={Boolean(depth)}
        className="peer group flex h-9 min-w-0 items-center border-b-transparent [content-visibility:auto] last:border-none [&:not(:has([data-entry]>*))]:hidden [&[data-depth='true']_[data-border]]:border-l"
      >
        <div
          style={{ width: `${numOfDigits + 2}ch` }}
          className="relative flex h-full shrink-0 items-center justify-center font-mono text-0.5xs text-gray-400/70 group-first:rounded-tl-2xl group-last:rounded-bl-2xl"
        >
          <div
            data-border
            className="absolute top-0 bottom-0 left-0 border-dashed border-gray-400/40"
          />
          {entry?.category === 'command' ? (
            (entry?.commandIndex ?? entry?.index ?? 0)
          ) : (
            <div className="mt-0.5 mr-1 hidden w-full border-b border-dashed border-gray-400/30" />
          )}
        </div>

        <div className="max-w-fit min-w-0 flex-auto" data-entry ref={setPortal}>
          {EntrySpecificComponent && (
            <RelatedEntries invocation={invocation} entry={entry}>
              <EntrySpecificComponent entry={entry} invocation={invocation} />
            </RelatedEntries>
          )}
        </div>
        <div className="relative min-w-20 flex-auto">
          <div className="h2-px bg2-gray-400/50 absolute right-0 left-0 translate-y-[0.5px] border-b border-dashed border-gray-300/50" />
        </div>
      </div>
      {invocation.journal?.version !== 1 || entry.category === 'event' ? (
        <TimelinePortal invocationId={invocation?.id} entry={entry}>
          {EntrySpecificComponent && (
            <EntryProgress entry={entry} invocation={invocation} />
          )}
        </TimelinePortal>
      ) : (
        entry.commandIndex === 1 && (
          <TimelinePortal invocationId={invocation?.id} entry={entry}>
            <div className="absolute w-full px-6 text-center font-sans text-0.5xs text-zinc-500">
              Update to the latest SDK to see more details in your journal.
              Check the{' '}
              <Link
                href="https://docs.restate.dev/operate/versioning#deploying-new-service-versions"
                target="_blank"
                rel="noopener noreferrer"
              >
                docs
              </Link>{' '}
              for more info.
            </div>
          </TimelinePortal>
        )
      )}
    </>
  );
}
