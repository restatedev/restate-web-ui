import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function ClearAllState({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'ClearAllState'; category?: 'command' }>
>) {
  return (
    <EntryExpression entry={entry} invocation={invocation} operationSymbol="" />
  );
}
