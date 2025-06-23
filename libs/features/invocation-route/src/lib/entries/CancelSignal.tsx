import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';

export function CancelSignal({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
>) {
  return (
    <div className="text-zinc-500 font-sans mr-2">
      <span className="font-medium text-gray-600">Cancellation</span> signal
      received.
    </div>
  );
}
