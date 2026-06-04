import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { RelativeTime } from './RelativeTime';

export function CancelSignal({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
>) {
  return (
    <div className="mr-2 flex items-center gap-2 font-sans text-zinc-500">
      <span className="shrink-0">
        <span className="font-medium text-gray-600">Cancellation</span> signal
        received.
      </span>
      <RelativeTime
        date={entry.start}
        tooltipTitle="Cancellation signal received at"
      />
    </div>
  );
}
