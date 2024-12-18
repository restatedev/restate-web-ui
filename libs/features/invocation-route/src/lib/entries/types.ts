import { Invocation, JournalEntry } from '@restate/data-access/admin-api';

export interface EntryProps<T extends JournalEntry> {
  entry: T;
  failed?: boolean;
  invocation: Invocation;
}
