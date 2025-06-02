import { JournalEntryV2 } from '@restate/data-access/admin-api';
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
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'AttachInvocation'; category?: 'command' }>
>) {
  const entryError = entry.error;

  return (
    <Expression
      name={'ctx.attach'}
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
