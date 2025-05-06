import { CancelSignalJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';

export function CancelSignal({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<CancelSignalJournalEntryType>) {
  return (
    <div className="text-zinc-600">
      <span className="font-medium font italic text-blue-500">
        Cancellation
      </span>{' '}
      request received.
    </div>
  );
}
