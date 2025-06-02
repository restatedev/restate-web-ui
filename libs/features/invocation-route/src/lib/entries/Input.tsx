import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function Input({
  entry,
  failed,
  invocation,
  isRetrying,
  wasRetrying,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>
>) {
  const error = entry.error;
  return (
    <>
      <Expression
        className={className}
        isHandler
        name={entry.handlerName ?? ''}
        input={
          <>
            {entry && (
              <InputOutput
                name="parameters"
                popoverTitle="Parameters"
                popoverContent={
                  <Value
                    value={entry.parameters}
                    className="text-xs font-mono py-3"
                  />
                }
              />
            )}
            {entry.parameters &&
              entry.headers &&
              entry.headers.length > 0 &&
              ', '}
            {entry.headers && entry.headers.length > 0 && (
              <InputOutput
                name="headers"
                popoverTitle=""
                className="px-0 bg-transparent border-none mx-0 [&&&]:mb-1"
                popoverContent={<Headers headers={entry.headers} />}
              />
            )}
          </>
        }
      />
      {error?.message && (
        <Failure
          message={error.message}
          restate_code={error.restateCode}
          isRetrying={entry.isRetrying}
        />
      )}
    </>
  );
}
