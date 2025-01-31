import { Invocation, JournalEntry } from '@restate/data-access/admin-api';
import { RestateError } from '@restate/util/errors';

export interface EntryProps<T extends JournalEntry> {
  entry: T;
  failed?: boolean;
  invocation: Invocation;
  appended?: boolean;
  error?: RestateError;
  isRetrying?: boolean;
}
