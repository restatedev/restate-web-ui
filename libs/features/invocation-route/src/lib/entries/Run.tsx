import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function Run({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Run'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        { paramName: 'name', title: 'Name', placeholderLabel: 'name' },
      ]}
      outputParam="value"
    />
  );
}
