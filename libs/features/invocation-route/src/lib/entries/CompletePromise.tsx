import { CompletePromiseJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function CompletePromise({
  entry,
  failed,
  invocation,
}: EntryProps<CompletePromiseJournalEntryType>) {
  const failure = entry.failure ?? entry.completion?.failure;
  return (
    <Expression
      prefix="await"
      name={entry.promise_name}
      output={
        <>
          {typeof entry.completion?.value === 'string' && (
            <InputOutput
              name={entry.completion.value}
              popoverTitle="Value"
              popoverContent={
                <Value
                  value={entry.completion.value}
                  className="text-xs font-mono py-3"
                />
              }
            />
          )}
          {typeof entry.completion?.value === 'undefined' && !failure && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
          {failure?.message && (
            <Failure
              message={failure.message}
              restate_code={failure.restate_code}
            />
          )}
        </>
      }
    />
  );
}
