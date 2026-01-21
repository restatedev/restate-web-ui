import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

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
        {
          paramName: 'name',
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
          hideWhenEntryIsPending
        />
      }
    />
  );
}
