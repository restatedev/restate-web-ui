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
import { useIsFit } from '../fitRows';
import { FitServiceTarget } from './FitServiceTarget';

const styles = tv({
  base: 'relative flex flex-auto flex-row items-center gap-1.5',
});

const invocationStyles = tv({
  base: 'mr-2',
  variants: {
    isFit: {
      true: 'ml-0.5 shrink-0 @max-[860px]/journal:mr-px [&_[data-invocation-icon]]:size-5.5 [&_[data-invocation-icon]]:rounded-md [&_[data-invocation-icon]>svg]:p-0.5 [&_[data-invocation-icon]>svg]:text-secondary',
      false: '-ml-1',
    },
  },
});

const expressionStyles = tv({
  base: '',
  variants: {
    isFit: {
      true: '@max-[860px]/journal:mr-px',
      false: '',
    },
  },
});

const chainStyles = tv({
  base: '',
  variants: {
    isFit: {
      true: '',
      false: 'pr-0 [&>*>*>*]:flex-auto',
    },
  },
});

const separatorStyles = tv({
  base: '-ml-1.5 text-subtle',
  variants: {
    isFit: {
      true: 'hidden',
      false: '',
    },
  },
});
export function Call({
  entry,
  invocation,
  className,
}: EntryProps<
  Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
>) {
  const isFit = useIsFit();
  return (
    <>
      <div className={styles({})}>
        <EntryExpression
          entry={entry}
          invocation={invocation}
          className={expressionStyles({ isFit: isFit })}
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
              {entry.serviceName &&
                entry.handlerName &&
                (isFit ? (
                  <FitServiceTarget
                    scope={entry.scope}
                    service={entry.serviceName}
                    serviceKey={entry.serviceKey}
                    handler={entry.handlerName}
                  />
                ) : (
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
                ))}
            </>
          }
          chain={
            <Expression
              name={'.' + entry.handlerName}
              operationSymbol=""
              isInline
              className={chainStyles({ isFit })}
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
            <div className={separatorStyles({ isFit: isFit })}>,</div>
            <InvocationId
              id={entry.invocationId}
              className={invocationStyles({ isFit: isFit })}
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
