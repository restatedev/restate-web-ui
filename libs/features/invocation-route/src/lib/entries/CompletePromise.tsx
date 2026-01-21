import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Failure } from '../Failure';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

export function CompletePromise({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'CompletePromise'; category?: 'command' }>
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
      operationSymbol=""
      hideErrorForFailureResult
      chain={
        <Expression
          name={'.' + (entry.resultType === 'failure' ? 'reject' : 'resolve')}
          operationSymbol=""
          className="pr-0 [&>*>*>*]:flex-auto"
          input={
            <div className="mx-0.5">
              {entry.resultType !== 'failure' && (
                <LazyJournalEntryPayload.Value
                  invocationId={invocation?.id}
                  entry={entry}
                  title="Value"
                  isBase64
                />
              )}
              {entry.error && (
                <Failure
                  message={entry.error.message!}
                  restate_code={entry.error.restateCode}
                  isRetrying={entry.isRetrying}
                  stacktrace={entry.error.stack}
                  className="text-2xs"
                />
              )}
            </div>
          }
        />
      }
    />
  );
}
