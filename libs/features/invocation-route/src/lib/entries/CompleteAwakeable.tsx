import { JournalEntryV2 } from '@restate/data-access/admin-api';
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
}: EntryProps<
  | Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'command' }
    >
  | Extract<
      JournalEntryV2,
      { type?: 'CompleteAwakeable'; category?: 'notification' }
    >
>) {
  const entryError = entry.error;

  return (
    <Expression
      name={'ctx.awakeable'}
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
              restate_code={entryError.restateCode}
              isRetrying={entry.isRetrying}
            />
          )}
        </>
      }
    />
  );
}
