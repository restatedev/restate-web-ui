import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';

import { EntryExpression } from './EntryExpression';

export function Output({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Output'; category?: 'command' }>
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
