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
  TransientError: undefined,
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
    getEntryId(invocation?.id ?? '', entry?.index, entry?.type, entry?.category)
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
        className=" [content-visibility:auto] [&[data-depth='true']_[data-border]]:border-l peer min-w-0 h-9 border-b-transparent  last:border-none flex items-center group [&:not(:has([data-entry]>*))]:hidden "
      >
        <div
          style={{ width: `${numOfDigits + 2}ch` }}
          className="font-mono relative shrink-0 text-gray-400/70 text-code flex items-center h-full justify-center group-first:rounded-tl-2xl group-last:rounded-bl-2xl"
        >
          <div
            data-border
            className="absolute top-0 bottom-0 left-0  border-dashed  border-gray-400/40"
          />
          {entry?.category === 'command' ? (
            entry?.commandIndex ?? entry?.index ?? 0
          ) : (
            <div className="w-full hidden border-b border-gray-400/30 border-dashed mr-1 mt-0.5" />
          )}
        </div>

        <div className="flex-auto min-w-0 max-w-fit" data-entry ref={setPortal}>
          {EntrySpecificComponent && (
            <RelatedEntries invocation={invocation} entry={entry}>
              <EntrySpecificComponent entry={entry} invocation={invocation} />
            </RelatedEntries>
          )}
        </div>
        <div className="relative flex-auto min-w-20">
          <div className="absolute left-0 right-0 h2-px bg2-gray-400/50 translate-y-[0.5px] border-b border-gray-300/50 border-dashed" />
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
            <div className="text-code px-6 text-zinc-500 text-center absolute font-sans w-full ">
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
