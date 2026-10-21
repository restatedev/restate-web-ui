import { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { useRestateContext } from '@restate/features-restate-context';
import { EntryProps } from './types';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';
import { CompleteSignalAction } from './CompleteSignalAction';

export function SignalNotification({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Signal'; category?: 'notification' }>
>) {
  const { isVersionGte } = useRestateContext();

  return (
    <>
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
            hideWhenEntryIsPending
          />
        }
      />
      {entry.isPending &&
        entry.signalName &&
        invocation?.id &&
        !invocation.completed_at &&
        isVersionGte?.('1.8.2') && (
          <CompleteSignalAction
            signalName={entry.signalName}
            invocationId={invocation.id}
          />
        )}
    </>
  );
}
