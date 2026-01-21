import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression } from '../Expression';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { Spinner } from '@restate/ui/loading';
import { tv } from '@restate/util/styles';
import { useJournalContext } from '../JournalContext';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

const styles = tv({
  base: 'relative flex flex-auto flex-row items-center gap-1.5',
});
export function Call({
  entry,
  invocation,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
>) {
  const {
    addInvocationId,
    removeInvocationId,
    isPending,
    invocationIds,
    error: invocationsError,
  } = useJournalContext();
  const isExpanded =
    entry.invocationId && invocationIds.includes(entry.invocationId);

  const invokedIsPending = isPending?.[String(entry.invocationId)];
  const invokedError = invocationsError?.[String(entry.invocationId)];

  return (
    <>
      <div className={styles({})}>
        <EntryExpression
          entry={entry}
          invocation={invocation}
          input={
            <Target
              showHandler={false}
              target={[entry.serviceName, entry.serviceKey, entry.handlerName]
                .filter((v) => typeof v === 'string')
                .join('/')}
              className="mx-0.5 h-6 basis-20 font-sans text-2xs not-italic **:data-target:h-6 [&_a]:my-0"
            />
          }
          chain={
            <Expression
              name={'.' + entry.handlerName}
              operationSymbol=""
              className="pr-0 [&>*>*>*]:flex-auto"
              input={
                <LazyJournalEntryPayload.Input
                  invocationId={invocation?.id}
                  entry={entry}
                  title="Input"
                  isBase64
                />
              }
            />
          }
          output={
            <LazyJournalEntryPayload.Value
              invocationId={invocation?.id}
              entry={entry}
              title="Result"
              isBase64
              hideWhenEntryIsPending
            />
          }
        />
        {entry.invocationId && (
          <>
            <div className="-ml-1.5 text-gray-400">,</div>
            <InvocationId
              id={entry.invocationId}
              className="mr-2 -ml-1"
              size="icon"
            />
          </>
        )}
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
