import { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { ServiceTarget } from '@restate/features-service-target';
import { EntryProps } from './types';
import { Expression, InputOutput } from '../Expression';
import { InvocationId } from '../../InvocationId';
import { tv } from '@restate/util-styles';
import { ExpandInvocationButton } from './ExpandInvocationButton';
import { EntryExpression } from './EntryExpression';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';
import { Value } from '../Value';

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
  return (
    <>
      <div className={styles({})}>
        <EntryExpression
          entry={entry}
          invocation={invocation}
          input={
            <>
              {entry.name && (
                <InputOutput
                  name={JSON.stringify(entry.name)}
                  popoverTitle={'Name'}
                  popoverContent={
                    <Value
                      value={entry.name}
                      className="font-mono text-xs"
                      showCopyButton
                      portalId="expression-value"
                    />
                  }
                />
              )}
              {entry.name && ', '}
              {entry.serviceName && entry.handlerName && (
                <ServiceTarget
                  scope={entry.scope}
                  service={entry.serviceName}
                  serviceKey={entry.serviceKey}
                  handler={entry.handlerName}
                  showHandler={false}
                  density="compact"
                  className="mx-0.5"
                  chipClassName="font-sans text-2xs not-italic"
                />
              )}
            </>
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
            <div className="-ml-1.5 text-subtle">,</div>
            <InvocationId
              id={entry.invocationId}
              className="mr-2 -ml-1"
              size="icon"
            />
          </>
        )}
      </div>
      <ExpandInvocationButton
        invocationId={entry.invocationId}
        parentInvocationId={invocation?.id}
      />
    </>
  );
}
