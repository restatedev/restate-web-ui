import type { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { RestateError } from '@restate/util/errors';

export interface EntryProps<T extends JournalEntryV2> {
  entry: T;
  failed?: boolean;
  invocation: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  appended?: boolean;
  error?: RestateError;
  isRetrying?: boolean;
  wasRetrying?: boolean;
  className?: string;
}

export type CommandEntryType = NonNullable<
  Extract<JournalEntryV2, { category?: 'command' }>['type']
>;
export type NotificationEntryType = NonNullable<
  Extract<JournalEntryV2, { category?: 'notification' }>['type']
>;
export type EventEntryType = NonNullable<
  Extract<JournalEntryV2, { category?: 'event' }>['type']
>;
