import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { EntryExpression } from './EntryExpression';

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
                <InputOutput
                  name="value"
                  popoverTitle="Value"
                  isValueHidden
                  popoverContent={
                    <Value
                      value={entry.value}
                      className="text-xs font-mono py-3"
                    />
                  }
                />
              )}
              {entry.error && (
                <div className="text-2xs">
                  <Failure
                    message={entry.error.message!}
                    restate_code={entry.error.restateCode}
                    isRetrying={entry.isRetrying}
                  />
                </div>
              )}
            </div>
          }
        />
      }
    />
  );
}
