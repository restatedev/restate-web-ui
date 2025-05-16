import { CallJournalEntryType } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { Failure } from '../Failure';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import { tv } from 'tailwind-variants';
import { useJournalContext } from '../JournalContext';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Entries } from '../Entries';

const styles = tv({
  base: 'flex flex-row gap-1.5 items-center pr-1.5 max-w-full relative',
});
export function Call({
  entry,
  failed,
  invocation,
  error,
  isRetrying,
  wasRetrying,
  className,
}: EntryProps<CallJournalEntryType>) {
  const entryError = entry.failure || error;
  const { setInvocationIds, isPending, invocationIds } = useJournalContext();
  const isExpanded =
    entry.invoked_id && invocationIds.includes(entry.invoked_id) && !isPending;

  return (
    <div className={styles({ className })}>
      <Button
        onClick={() => {
          setInvocationIds?.((ids) => {
            if (entry.invoked_id && !ids.includes(entry.invoked_id)) {
              return [...ids, entry.invoked_id!];
            } else {
              return ids.filter((id) => id !== entry.invoked_id);
            }
          });
        }}
        variant="icon"
        className="absolute right-[100%] z-20"
      >
        {isPending ? (
          <Spinner />
        ) : (
          <Icon
            name={isExpanded ? IconName.ChevronUp : IconName.ChevronDown}
            className="w-3.5 h-3.5"
          />
        )}
      </Button>
      <Target
        target={entry.invoked_target}
        className="[font-size:1.02em] [&_a_svg]:w-3.5 [&_a_svg]:h-3.5"
        showHandler={false}
      >
        <Expression
          isHandler
          className="min-w-0"
          name={entry.invoked_target?.split('/').at(-1) ?? ''}
          input={
            <>
              {entry.parameters && (
                <InputOutput
                  name="parameters"
                  popoverTitle="Parameters"
                  popoverContent={
                    <Value
                      value={entry.parameters}
                      className="text-xs font-mono py-3"
                    />
                  }
                />
              )}
              {entry.parameters &&
                entry.headers &&
                entry.headers.length > 0 &&
                ', '}
              {entry.headers && entry.headers.length > 0 && (
                <InputOutput
                  name="headers"
                  popoverTitle=""
                  className="px-0 bg-transparent border-none mx-2 [&&&]:mb-3"
                  popoverContent={<Headers headers={entry.headers} />}
                />
              )}
            </>
          }
          output={
            <>
              {typeof entry.value === 'string' && (
                <InputOutput
                  name={entry.value}
                  popoverTitle="Response"
                  popoverContent={
                    <Value
                      value={entry.value}
                      className="text-xs font-mono py-3"
                    />
                  }
                />
              )}
              {typeof entry.value === 'undefined' &&
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
                  isRetrying={isRetrying || wasRetrying}
                />
              )}
            </>
          }
        />
      </Target>
      {entry.invoked_id && (
        <InvocationId
          id={entry.invoked_id}
          className="min-w-[1.625rem] w-[1.625rem] shrink-0 flex"
          size="icon"
        />
      )}
      {entry.invoked_id &&
        invocationIds.includes(entry.invoked_id) &&
        !isPending && (
          <Entries invocationId={entry.invoked_id} showInputEntry={false} />
        )}
    </div>
  );
}
