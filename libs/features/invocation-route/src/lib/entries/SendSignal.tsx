import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function SendSignal({
  entry,
  invocation,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'SendSignal'; category?: 'command' }>
>) {
  return (
    <EntryExpression
      entry={entry}
      invocation={invocation}
      inputParams={[
        {
          paramName: 'signalName',
          title: 'Signal name',
          placeholderLabel: 'name',
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
