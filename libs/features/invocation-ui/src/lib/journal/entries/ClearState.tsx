import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function ClearState({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'ClearState'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'key',
          title: 'Key',
          placeholderLabel: 'key',
          shouldStringified: true,
        },
      ]}
      operationSymbol=""
    />
  );
}
