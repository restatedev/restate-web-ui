import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { InvocationId } from '../InvocationId';
import { EntryExpression } from './EntryExpression';
import { tv } from 'tailwind-variants';
import { useJournalContext } from '../JournalContext';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { Button } from '@restate/ui/button';
import { Spinner } from '@restate/ui/loading';
import { Icon, IconName } from '@restate/ui/icons';

const styles = tv({
  base: 'flex flex-row gap-1.5 items-center pr-20  relative flex-auto',
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
    <div className={styles({ className })}>
      {invokedError ? (
        <CallInvokedLoadingError
          error={invokedError}
          className="absolute right-[100%]"
        />
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
          className="absolute right-0"
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
      <EntryExpression
        entry={entry}
        invocation={invocation}
        inputParams={[
          { paramName: 'name', title: 'Name', placeholderLabel: 'name' },
        ]}
        input={
          <InvocationId
            id={String(entry.invocationId)}
            className="truncate max-w-[15ch] text-2xs not-italic font-semibold text-gray-500 mx-0.5 "
            size="md"
          />
        }
        outputParam="value"
      />
    </div>
  );
}
