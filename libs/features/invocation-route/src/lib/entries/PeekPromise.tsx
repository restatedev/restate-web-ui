import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';

export function PeekPromise({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'PeekPromise'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'promiseName',
          title: 'Name',
          placeholderLabel: 'name',
          shouldStringified: true,
        },
      ]}
      outputParam="value"
      chain=".peak"
      isOutputBase64
    />
  );
}
