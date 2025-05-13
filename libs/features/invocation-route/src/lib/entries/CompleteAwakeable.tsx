import { CompleteAwakeableJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function CompleteAwakeable({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<CompleteAwakeableJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name={'ctx.awakeable'}
      prefix="async"
      {...(typeof entry.id === 'string' && {
        input: (
          <InputOutput
            name={JSON.stringify(entry.id)}
            popoverTitle="Id"
            popoverContent={
              <Value value={entry.id} className="text-xs font-mono py-3" />
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
          {typeof entry.value === 'undefined' && !entryError && (
            <div className="text-zinc-400 font-semibold font-mono text-2xs">
              void
            </div>
          )}
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
