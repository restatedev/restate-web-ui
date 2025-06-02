import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function Output({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Output'; category?: 'command' }>
>) {
  const entryError = entry.error;

  return (
    <Expression
      prefix="return"
      isFunction={false}
      operationSymbol={''}
      name={''}
      output={
        <>
          {typeof entry.value === 'string' && (
            <InputOutput
              name={entry.value}
              popoverTitle="Response"
              popoverContent={
                <Value value={entry.value} className="text-xs font-mono py-3" />
              }
            />
          )}
          {typeof entry.value === 'undefined' && !entryError && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restateCode}
              isRetrying={entry.isRetrying}
            />
          )}
        </>
      }
    />
  );
}
