import { JournalEntryV2 } from '@restate/data-access/admin-api';
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
import { CallInvokedLoadingError } from './CallInvokedLoadingError';

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
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
>) {
  const entryError = entry.error;
  const {
    setInvocationIds,
    isPending,
    invocationIds,
    error: invocationsError,
  } = useJournalContext();
  const isExpanded =
    entry.invocationId &&
    invocationIds.includes(entry.invocationId) &&
    !isPending;

  const invokedIsPending = isPending?.[String(entry.invocationId)];
  const invokedError = invocationsError?.[String(entry.invocationId)];
  const target = [entry.serviceName, entry.serviceKey, entry.handlerName]
    .filter(Boolean)
    .join('/');

  return (
    <div className={styles({ className })}>
      {invokedError ? (
        <CallInvokedLoadingError
          error={invokedError}
          className="absolute right-[100%]"
        />
      ) : (
        <Button
          onClick={() => {
            setInvocationIds?.((ids) => {
              if (entry.invocationId && !ids.includes(entry.invocationId)) {
                return [...ids, entry.invocationId];
              } else {
                return ids.filter((id) => id !== entry.invocationId);
              }
            });
          }}
          variant="icon"
          className="absolute right-[100%]"
        >
          {invokedIsPending ? (
            <Spinner />
          ) : (
            <Icon
              name={isExpanded ? IconName.ChevronUp : IconName.ChevronDown}
              className="w-3.5 h-3.5"
            />
          )}
        </Button>
      )}
      <Target
        target={target}
        className="[font-size:1.02em] [&_a_svg]:w-3.5 [&_a_svg]:h-3.5"
        showHandler={false}
      >
        <Expression
          isHandler
          className="min-w-0"
          name={entry?.handlerName ?? ''}
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
                !entry.isPending && (
                  <div className="text-zinc-400 font-semibold font-mono text-2xs">
                    void
                  </div>
                )}
              {entry.isPending && (!entryError || entry.isRetrying) && (
                <Ellipsis />
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
      </Target>
      {entry.invocationId && (
        <InvocationId
          id={entry.invocationId}
          className="min-w-[1.625rem] w-[1.625rem] shrink-0 flex"
          size="icon"
        />
      )}
      {entry.invocationId &&
        invocationIds.includes(entry.invocationId) &&
        !invokedIsPending && (
          <Entries invocationId={entry.invocationId} showInputEntry={false} />
        )}
    </div>
  );
}
