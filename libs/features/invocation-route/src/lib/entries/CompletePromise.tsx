import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';

export function CompletePromise({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'CompletePromise'; category?: 'command' }>
>) {
  const failure = entry.error;
  return (
    <Expression
      name={'ctx.promise'}
      {...(typeof entry.promiseName === 'string' && {
        input: (
          <InputOutput
            name={JSON.stringify(entry.promiseName)}
            popoverTitle="Name"
            popoverContent={
              <Value
                value={entry.promiseName}
                className="text-xs font-mono py-3"
              />
            }
          />
        ),
      })}
      chain={entry.resultType === 'failure' ? '.reject' : '.resolve'}
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
            !failure &&
            !entry.isPending && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {entry.isPending && (!failure || entry.isRetrying) && <Ellipsis />}
          {failure?.message && (
            <Failure
              message={failure.message}
              restate_code={failure.restateCode}
              isRetrying={entry.isRetrying}
            />
          )}
        </>
      }
    />
  );
}
