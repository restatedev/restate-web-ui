import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

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
      output={
        <LazyJournalEntryPayload.Value
          invocationId={invocation?.id}
          entry={entry}
          title="Result"
          isBase64
          hideWhenEntryIsPending
        />
      }
      chain=".peak"
    />
  );
}
