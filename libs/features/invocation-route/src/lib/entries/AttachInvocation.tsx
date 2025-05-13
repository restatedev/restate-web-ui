import { AttachInvocationJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Failure } from '../Failure';
import { Ellipsis } from '@restate/ui/loading';
import { InvocationId } from '../InvocationId';

export function AttachInvocation({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
}: EntryProps<AttachInvocationJournalEntryType>) {
  const entryError = entry.failure || error;

  return (
    <Expression
      name={'attach'}
      prefix="async"
      className="pr-0"
      {...(typeof entry.invocationId === 'string' && {
        input: (
          <InvocationId
            id={String(entry.invocationId)}
            size="sm"
            className="truncate max-w-[15ch]"
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
