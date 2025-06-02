import { JournalEntryV2 } from '@restate/data-access/admin-api';
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
  wasRetrying,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'GetStateKeys' | 'GetEagerStateKeys'; category?: 'command' }
  >
>) {
  const entryError = entry.error;

  return (
    <Expression
      name="ctx.keys"
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
