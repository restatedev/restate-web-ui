import type {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { ActionPortal, EntryPortal, getActionId } from './Portals';
import { EventEntryType, NotificationEntryType } from './entries/types';
import { ComponentType, PropsWithChildren } from 'react';
import { CompletionNotification } from './entries/CompletionNotification';
import { TransientError } from './entries/TransientError';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { isRestateAsNewSupported } from './actions/Actions';
import { useJournalContext } from './JournalContext';

const NOTIFICATIONS_COMPONENTS: {
  [K in NotificationEntryType]:
    | ComponentType<
        PropsWithChildren<{
          entry: JournalEntryV2;
          commandIndex: number;
          index: number;
          invocation?: Invocation;
        }>
      >
    | undefined;
} = {
  Call: CompletionNotification,
  Sleep: CompletionNotification,
  GetPromise: CompletionNotification,
  PeekPromise: CompletionNotification,
  CompletePromise: CompletionNotification,
  CompleteAwakeable: CompletionNotification,
  Run: CompletionNotification,
  AttachInvocation: CompletionNotification,
  Cancel: undefined,
  CallInvocationId: undefined,
};

const EVENTS_COMPONENTS: {
  [K in EventEntryType]:
    | ComponentType<
        PropsWithChildren<{
          entry: JournalEntryV2;
          commandIndex: number;
          index: number;
          invocation?: Invocation;
        }>
      >
    | undefined;
} = {
  'Event: TransientError': TransientError,
  Created: undefined,
  Running: undefined,
  Suspended: undefined,
  Pending: undefined,
  Completion: undefined,
  Retrying: undefined,
  Scheduled: undefined,
  Paused: TransientError,
  'Event: Paused': undefined,
};

export function RelatedEntries({
  invocation,
  entry,
  depth,
  children,
}: PropsWithChildren<{
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  entry?: JournalEntryV2;
  depth?: number;
}>) {
  if (!entry?.type) {
    return null;
  }

  return (
    <>
      {children}
      {entry?.relatedIndexes &&
        entry.relatedIndexes.length > 0 &&
        entry.relatedIndexes.map((relatedIndex) => {
          const relatedEntry = invocation?.journal?.entries?.find(
            (entry) => entry.index === relatedIndex,
          );
          if (
            !relatedEntry ||
            entry.commandIndex === undefined ||
            entry.index === undefined
          ) {
            return null;
          }

          const Component =
            relatedEntry.category === 'notification'
              ? NOTIFICATIONS_COMPONENTS[
                  relatedEntry?.type as NotificationEntryType
                ]
              : relatedEntry.category === 'event'
                ? EVENTS_COMPONENTS[relatedEntry?.type as EventEntryType]
                : undefined;

          if (Component && invocation) {
            return (
              <EntryPortal
                invocationId={invocation?.id}
                category={relatedEntry?.category}
                type={relatedEntry?.type}
                index={relatedEntry?.index}
                key={relatedIndex}
              >
                <Component
                  entry={relatedEntry}
                  commandIndex={entry.commandIndex}
                  index={entry.index}
                  children={children}
                  invocation={invocation}
                />
              </EntryPortal>
            );
          }

          return null;
        })}
    </>
  );
}

export function RestartAction({
  invocation,
  entry,
  depth = 0,
}: {
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  entry?: JournalEntryV2;
  depth?: number;
}) {
  const { firstPendingCommandIndex } = useJournalContext();
  if (
    depth === 0 &&
    invocation &&
    isRestateAsNewSupported(invocation) &&
    entry?.category === 'command' &&
    entry?.type !== 'Output' &&
    entry
  ) {
    if (
      typeof firstPendingCommandIndex === 'number' &&
      typeof entry.index === 'number' &&
      entry.index >= firstPendingCommandIndex
    ) {
      return null;
    }

    return (
      <ActionPortal invocationId={String(invocation?.id)} entry={entry}>
        <div className="h-full w-9 bg-red-100" />
      </ActionPortal>
    );
  }
  return null;
}
