import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function Awakeable({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Awakeable'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'id',
          title: 'Id',
          placeholderLabel: 'id',
          shouldStringified: true,
        },
      ]}
      outputParam="value"
    />
  );
}
