import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function SignalNotification({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Signal'; category?: 'notification' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      name="signal"
      inputParams={[
        {
          paramName: 'signalName',
          title: 'Signal name',
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
