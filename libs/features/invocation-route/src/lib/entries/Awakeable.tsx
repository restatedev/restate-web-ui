import { AwakeableJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function Awakeable({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<AwakeableJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name={'ctx.awakeable'}
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
