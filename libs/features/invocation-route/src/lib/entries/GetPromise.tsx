import { GetPromiseJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function GetPromise({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<GetPromiseJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name={'ctx.promise'}
      {...(typeof entry.promise_name === 'string' && {
        input: (
          <InputOutput
            name={JSON.stringify(entry.promise_name)}
            popoverTitle="Name"
            popoverContent={
              <Value
                value={entry.promise_name}
                className="text-xs font-mono py-3"
              />
            }
          />
        ),
      })}
      output={
        <>
          {typeof entry.value === 'string' && (
            <InputOutput
              name={entry.value}
              popoverTitle="Value"
              popoverContent={
                <Value value={entry.value} className="text-xs font-mono py-3" />
              }
            />
          )}
          {(typeof entry.value === 'undefined' ||
            (entry.version === 1 && entry.value === '')) &&
            !entryError &&
            entry.completed && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {!entry.completed && (!entryError || isRetrying) && <Ellipsis />}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restate_code}
              isRetrying={isRetrying || wasRetrying}
            />
          )}
        </>
      }
    />
  );
}
