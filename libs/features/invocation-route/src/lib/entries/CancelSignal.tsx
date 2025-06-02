import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';

export function CancelSignal({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
>) {
  return (
    <div className="text-zinc-600">
      <span className="font-medium font italic text-blue-500">
        Cancellation
      </span>{' '}
      request received.
    </div>
  );
}
