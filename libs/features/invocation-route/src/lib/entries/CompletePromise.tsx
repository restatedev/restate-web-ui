import { CompletePromiseJournalEntryType } from '@restate/data-access/admin-api';
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
}: EntryProps<CompletePromiseJournalEntryType>) {
  const failure = entry.failure ?? entry.completion?.failure ?? error;
  return (
    <Expression
      name={'ctx.promise'}
      prefix="async"
      {...(typeof entry.promise_name === 'string' && {
        input: (
          <InputOutput
            name={JSON.stringify(entry.promise_name)}
            popoverTitle="Name"
            popoverContent={
              <Value
                value={entry.promise_name}
                className="text-xs font-mono py-3"
              />
            }
          />
        ),
      })}
      chain={entry.completion?.failure ? '.reject' : '.resolve'}
      output={
        <>
          {typeof entry.completion?.value === 'string' && (
            <InputOutput
              name={entry.completion.value}
              popoverTitle="Value"
              popoverContent={
                <Value
                  value={entry.completion.value}
                  className="text-xs font-mono py-3"
                />
              }
            />
          )}
          {typeof entry.completion?.value === 'undefined' &&
            !failure &&
            entry.completed && (
              <div className="text-zinc-400 font-semibold font-mono text-2xs">
                void
              </div>
            )}
          {!entry.completed && (!failure || isRetrying) && <Ellipsis />}
          {failure?.message && (
            <Failure
              message={failure.message}
              restate_code={failure.restate_code}
              isRetrying={isRetrying || wasRetrying}
            />
          )}
        </>
      }
    />
  );
}
