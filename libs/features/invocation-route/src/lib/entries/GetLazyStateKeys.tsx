import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function GetLazyStateKeys({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'GetLazyStateKeys'; category?: 'command' }>
  | Extract<
      JournalEntryV2,
      { type?: 'GetLazyStateKeys'; category?: 'notification' }
    >
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      output={
        <LazyJournalEntryPayload.Keys
          invocationId={invocation?.id}
          entry={entry}
          title="Keys"
        />
      }
    />
  );
}
