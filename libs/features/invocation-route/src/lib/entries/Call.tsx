import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { Value } from '../Value';
import { Target } from '../Target';
import { InvocationId } from '../InvocationId';
import { Spinner } from '@restate/ui/loading';
import { tv } from 'tailwind-variants';
import { useJournalContext } from '../JournalContext';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { CallInvokedLoadingError } from './CallInvokedLoadingError';
import { EntryExpression } from './EntryExpression';
import { Headers } from '../Headers';

const styles = tv({
  base: 'flex flex-row gap-1.5 items-center pr-20  relative flex-auto',
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

  console.log(isExpanded);

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
              name={isExpanded ? IconName.X : IconName.Plus}
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
          <Target
            showHandler={false}
            target={[entry.serviceName, entry.serviceKey, entry.handlerName]
              .filter((v) => typeof v === 'string')
              .join('/')}
            className="font-sans not-italic mx-0.5 basis-20 text-2xs h-6 [&_a]:my-0 [&_[data-target]]:h-6 "
          />
        }
        chain={
          <Expression
            name={'.' + entry.handlerName}
            operationSymbol=""
            className="pr-0 [&>*>*>*]:flex-auto"
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
                    className="px-0 bg-transparent border-none mx-0 [&&&]:mb-1"
                    popoverContent={<Headers headers={entry.headers} />}
                  />
                )}
              </>
            }
          />
        }
        outputParam="value"
      />
      {entry.invocationId && (
        <>
          <div className="text-gray-400 -ml-1.5">,</div>
          <InvocationId id={entry.invocationId} className="-ml-1" size="icon" />
        </>
      )}
    </div>
  );
}
