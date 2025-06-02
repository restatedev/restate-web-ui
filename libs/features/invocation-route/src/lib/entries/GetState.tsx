import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function GetState({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'GetState' | 'GetEagerState'; category?: 'command' }
  >
>) {
  const entryError = entry.error;

  return (
    <Expression
      isFunction={false}
      name={entry.key ?? ''}
      prefix="get"
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
          {typeof entry.value === 'undefined' &&
            !entryError &&
            !entry.isPending && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {entry.isPending && (!entryError || entry.isRetrying) && <Ellipsis />}
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
