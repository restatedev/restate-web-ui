import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { InvocationId } from '../InvocationId';

export function Cancel({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      operationSymbol=""
      input={
        <InvocationId
          id={String(entry.invocationId)}
          className="mx-0.5 max-w-[15ch] truncate text-2xs font-semibold text-gray-500 not-italic"
          size="md"
        />
      }
    />
  );
}
