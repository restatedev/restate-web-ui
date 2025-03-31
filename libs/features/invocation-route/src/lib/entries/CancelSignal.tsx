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
    <div className="italic">
      <span className="font-semibold">Cancellation</span> request received.
    </div>
  );
}
