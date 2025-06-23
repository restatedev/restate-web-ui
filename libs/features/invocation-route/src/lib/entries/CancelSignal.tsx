import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';

export function CancelSignal({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
>) {
  return (
    <div className="text-zinc-600 font-sans">
      <span className="font-medium font italic text-gray-800">
        Cancellation
      </span>{' '}
      request received.
    </div>
  );
}
