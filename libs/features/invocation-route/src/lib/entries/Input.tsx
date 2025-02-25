import { InputJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function Input({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<InputJournalEntryType>) {
  return (
    <>
      <Expression
        isHandler
        name={invocation.target_handler_name}
        input={
          <>
            {entry.body && (
              <InputOutput
                name="parameters"
                popoverTitle="Parameters"
                popoverContent={
                  <Value
                    value={entry.body}
                    className="text-xs font-mono py-3"
                  />
                }
              />
            )}
            {entry.body && entry.headers && entry.headers.length > 0 && ', '}
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
          restate_code={error.restate_code}
          isRetrying={isRetrying || wasRetrying}
        />
      )}
    </>
  );
}
