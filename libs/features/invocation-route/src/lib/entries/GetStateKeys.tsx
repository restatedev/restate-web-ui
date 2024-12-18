import { GetStateKeysJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';

export function GetStateKeys({
  entry,
  failed,
  invocation,
}: EntryProps<GetStateKeysJournalEntryType>) {
  return (
    <Expression
      name="keys"
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
          {entry.keys && entry.keys.length === 0 && (
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
