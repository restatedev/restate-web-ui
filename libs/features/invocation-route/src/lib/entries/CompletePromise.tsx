import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { EntryExpression } from './EntryExpression';
import { useRestateContext } from '@restate/features/restate-context';

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
  const { EncodingWaterMark } = useRestateContext();
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
                      className="font-mono text-xs"
                      isBase64
                      showCopyButton
                      portalId="expression-value"
                    />
                  }
                  {...(EncodingWaterMark && {
                    waterMark: <EncodingWaterMark value={entry.value} />,
                  })}
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
