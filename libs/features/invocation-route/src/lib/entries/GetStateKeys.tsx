import { GetStateKeysJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function GetStateKeys({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
}: EntryProps<GetStateKeysJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name="keys"
      prefix="get"
      output={
        <>
          {entry.keys && entry.keys.length > 0 && (
            <InputOutput
              name={entry.keys.map((key) => JSON.stringify(key)).join(', ')}
              popoverTitle="Keys"
              popoverContent={
                <ul className="flex flex-col gap-2">
                  {entry.keys.map((key) => (
                    <Value
                      value={key}
                      key={key}
                      className="text-xs font-mono first:pt-3 last:pb-3"
                    />
                  ))}
                </ul>
              }
            />
          )}
          {entry.keys &&
            entry.keys.length === 0 &&
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
              isRetrying={isRetrying}
            />
          )}
        </>
      }
    />
  );
}
