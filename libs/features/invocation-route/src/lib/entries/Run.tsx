import { RunJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function Run({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<RunJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name={'ctx.run'}
      className="pr-0"
      {...(typeof entry.name === 'string' &&
        entry.name && {
          input: (
            <InputOutput
              name={JSON.stringify(entry.name)}
              popoverTitle="Name"
              popoverContent={
                <Value value={entry.name} className="text-xs font-mono py-3" />
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
          {!entry.completed && (!entryError || isRetrying) && <Ellipsis />}
          {(typeof entry.value === 'undefined' ||
            (entry.version === 1 && entry.value === '')) &&
            !entryError &&
            entry.completed && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restate_code}
              isRetrying={isRetrying || wasRetrying}
              className="-mr-1.5"
            />
          )}
        </>
      }
    />
  );
}
