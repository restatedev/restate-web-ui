import { JournalEntryV2 } from '@restate/data-access/admin-api';
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
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Run'; category?: 'command' }>
>) {
  const entryError = entry.error;

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
          {entry.isPending && (!entryError || entry.isRetrying) && <Ellipsis />}
          {typeof entry.value === 'undefined' &&
            !entryError &&
            !entry.isPending && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {entryError?.message && (
            <Failure
              message={entryError.message}
              restate_code={entryError.restateCode}
              isRetrying={entry.isRetrying}
              className="-mr-1.5"
            />
          )}
        </>
      }
    />
  );
}
