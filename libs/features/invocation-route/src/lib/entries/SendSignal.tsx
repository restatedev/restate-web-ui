import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';
import { InvocationId } from '../InvocationId';
import { Value } from '../Value';

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
      input={
        <>
          {entry.invocationId && (
            <InvocationId
              id={entry.invocationId}
              size="md"
              className="max-w-[15ch] truncate px-0.5 text-2xs font-semibold text-gray-500 not-italic"
            />
          )}
          {entry.invocationId && entry.signalName && ', '}
          {entry.signalName && (
            <InputOutput
              name={JSON.stringify(entry.signalName)}
              popoverTitle="Signal name"
              popoverContent={
                <Value
                  value={entry.signalName}
                  className="font-mono text-xs"
                  showCopyButton
                  portalId="expression-value"
                />
              }
            />
          )}
        </>
      }
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
