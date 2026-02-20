import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Failure } from '../Failure';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function CompleteAwakeable({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'CompleteAwakeable'; category?: 'command' }>
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
      operationSymbol=""
      chain={
        <Expression
          name={'.' + (entry.resultType === 'failure' ? 'reject' : 'resolve')}
          operationSymbol=""
          className="pr-0 [&>*>*>*]:flex-auto"
          input={
            <div className="mx-0.5">
              <LazyJournalEntryPayload.Value
                invocationId={invocation?.id}
                entry={entry}
                title="Value"
                isBase64
              />
            </div>
          }
        />
      }
    />
  );
}

export function CompleteAwakeableNotification({
  entry,
  invocation,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'CompleteAwakeable'; category?: 'notification' }
  >
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
