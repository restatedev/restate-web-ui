import { memo } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import {
  useIsCircularRef,
  useJournalEntriesContext,
  useJournalExpansionContext,
} from '../JournalContext';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { CircularRefWarning } from './CircularRefWarning';

export function ExpandInvocationButton({
  invocationId,
  parentInvocationId,
}: {
  invocationId?: string;
  parentInvocationId?: string;
}) {
  const { addInvocationId, removeInvocationId, disableExpand } =
    useJournalEntriesContext();
  const { invocationIds, isPending, error } = useJournalExpansionContext();
  const isCircularRef = useIsCircularRef(invocationId, parentInvocationId);

  if (disableExpand || !invocationId) {
    return null;
  }

  return (
    <ExpandInvocationToggle
      invocationId={invocationId}
      isCircularRef={isCircularRef}
      isExpanded={!isCircularRef && invocationIds.includes(invocationId)}
      isPending={isPending?.[invocationId]}
      error={error?.[invocationId]}
      onExpand={addInvocationId}
      onCollapse={removeInvocationId}
    />
  );
}

const ExpandInvocationToggle = memo(function ExpandInvocationToggle({
  invocationId,
  isCircularRef,
  isExpanded,
  isPending,
  error,
  onExpand,
  onCollapse,
}: {
  invocationId: string;
  isCircularRef: boolean;
  isExpanded: boolean;
  isPending?: boolean;
  error?: Error | null;
  onExpand?: (id: string) => void;
  onCollapse?: (id: string) => void;
}) {
  return (
    <div className="absolute top-0 right-1 bottom-0 flex items-center">
      {isCircularRef ? (
        <CircularRefWarning />
      ) : error ? (
        <CallInvokedLoadingError error={error} className="" />
      ) : (
        <Button
          onClick={() => {
            if (isExpanded) {
              onCollapse?.(invocationId);
            } else {
              onExpand?.(invocationId);
            }
          }}
          variant="icon"
          className="z-10 bg-tint-subtle"
          aria-label={isExpanded ? 'Collapse invocation' : 'Expand invocation'}
          aria-expanded={isExpanded}
        >
          {isPending ? (
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
});
