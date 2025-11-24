import type {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { EntryPortal } from './Portals';
import { EventEntryType, NotificationEntryType } from './entries/types';
import { ComponentType, PropsWithChildren } from 'react';
import { CompletionNotification } from './entries/CompletionNotification';
import { TransientError } from './entries/TransientError';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';

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
