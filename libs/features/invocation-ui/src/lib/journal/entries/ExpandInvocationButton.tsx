import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { useIsCircularRef, useJournalEntriesContext } from '../JournalContext';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { CircularRefWarning } from './CircularRefWarning';

export function ExpandInvocationButton({
  invocationId,
  parentInvocationId,
}: {
  invocationId?: string;
  parentInvocationId?: string;
}) {
  const {
    addInvocationId,
    removeInvocationId,
    isPending,
    invocationIds,
    error: invocationsError,
    disableExpand,
  } = useJournalEntriesContext();
  const isCircularRef = useIsCircularRef(invocationId, parentInvocationId);

  if (disableExpand || !invocationId) {
    return null;
  }

  const isExpanded = !isCircularRef && invocationIds.includes(invocationId);
  const invokedIsPending = isPending?.[invocationId];
  const invokedError = invocationsError?.[invocationId];

  return (
    <div className="absolute top-0 right-1 bottom-0 flex items-center">
      {isCircularRef ? (
        <CircularRefWarning />
      ) : invokedError ? (
        <CallInvokedLoadingError error={invokedError} className="" />
      ) : (
        <Button
          onClick={() => {
            if (invocationIds.includes(invocationId)) {
              removeInvocationId?.(invocationId);
            } else {
              addInvocationId?.(invocationId);
            }
          }}
          variant="icon"
          className="z-10 bg-tint-subtle"
          aria-label={isExpanded ? 'Collapse invocation' : 'Expand invocation'}
          aria-expanded={isExpanded}
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
  );
}
