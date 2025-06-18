import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function GetState({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'GetState' | 'GetEagerState'; category?: 'command' }
  >
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
      outputParam="value"
    />
  );
}
