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
          className="truncate max-w-[15ch] text-2xs not-italic font-semibold text-gray-500 mx-0.5 "
          size="md"
        />
      }
    />
  );
}
