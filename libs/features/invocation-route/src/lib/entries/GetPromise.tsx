import { GetPromiseJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function GetPromise({
  entry,
  failed,
  invocation,
}: EntryProps<GetPromiseJournalEntryType>) {
  return (
    <Expression
      name={entry.promise_name}
      prefix="await"
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
          {typeof entry.value === 'undefined' && !entry.failure && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {entry.failure?.message && (
            <Failure
              message={entry.failure.message}
              restate_code={entry.failure.restate_code}
            />
          )}
        </>
      }
    />
  );
}
