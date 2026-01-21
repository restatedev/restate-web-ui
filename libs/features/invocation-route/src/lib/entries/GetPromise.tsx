import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function GetPromise({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'GetPromise'; category?: 'command' }>
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
      output={
        <LazyJournalEntryPayload.Value
          invocationId={invocation?.id}
          entry={entry}
          title="Result"
          isBase64
        />
      }
    />
  );
}
