import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function CancelSignal({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'notification' }>
>) {
  return (
    <EntryExpression entry={entry} invocation={invocation} operationSymbol="" />
  );

  return (
    <div className="text-zinc-600 font-sans">
      <span className="font-medium font italic text-blue-500">
        Cancellation
      </span>{' '}
      request received.
    </div>
  );
}
