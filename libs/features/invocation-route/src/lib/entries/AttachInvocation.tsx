import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { InvocationId } from '../InvocationId';
import { EntryExpression } from './EntryExpression';
import { tv } from '@restate/util/styles';
import { useJournalContext } from '../JournalContext';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { Button } from '@restate/ui/button';
import { Spinner } from '@restate/ui/loading';
import { Icon, IconName } from '@restate/ui/icons';

const styles = tv({
  base: 'relative flex flex-auto flex-row items-center gap-1.5',
});

export function AttachInvocation({
  entry,
  invocation,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'AttachInvocation'; category?: 'command' }>
>) {
  const {
    addInvocationId,
    removeInvocationId,
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

  return (
    <>
      <div className={styles({ className })}>
        <EntryExpression
          entry={entry}
          invocation={invocation}
          input={
            <InvocationId
              id={String(entry.invocationId)}
              className="mx-0.5 max-w-[15ch] truncate text-2xs font-semibold text-gray-500 not-italic"
              size="md"
            />
          }
          outputParam="value"
          isOutputBase64
        />
      </div>
      <div className="absolute top-0 right-1 bottom-0 flex items-center">
        {invokedError ? (
          <CallInvokedLoadingError error={invokedError} className="" />
        ) : (
          <Button
            onClick={() => {
              if (entry.invocationId) {
                if (invocationIds.includes(entry.invocationId)) {
                  removeInvocationId?.(entry.invocationId);
                } else {
                  addInvocationId?.(entry.invocationId);
                }
              }
            }}
            variant="icon"
            className="z-10 bg-black/3"
          >
            {invokedIsPending ? (
              <Spinner />
            ) : (
              <Icon
                name={isExpanded ? IconName.X : IconName.Plus}
                className="h-3.5 w-3.5"
              />
            )}
          </Button>
        )}
      </div>
    </>
  );
}
