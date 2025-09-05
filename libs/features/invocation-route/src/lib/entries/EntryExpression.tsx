import type { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Expression, InputOutput } from '../Expression';
import { CommandEntryType } from './types';
import { ReactNode } from 'react';
import { Ellipsis } from '@restate/ui/loading';
import { Failure } from '../Failure';
import { Value } from '../Value';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { isEntryCompletionAmbiguous } from './isEntryCompletionAmbiguous';
import { useRestateContext } from '@restate/features/restate-context';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';

const NAME_COMMANDS_COMPONENTS: {
  [K in CommandEntryType]: string;
} = {
  Input: '',
  GetState: 'get',
  GetEagerState: 'get',
  SetState: 'set',
  GetStateKeys: 'keys',
  GetEagerStateKeys: 'keys',
  ClearState: 'clear',
  ClearAllState: 'clearAll',
  Call: 'call',
  Run: 'run',
  Output: '',
  OneWayCall: 'send',
  Sleep: 'sleep',
  CompleteAwakeable: 'awakeable',
  Awakeable: 'awakeable',
  AttachInvocation: 'attach',
  Cancel: 'cancel',
  GetPromise: 'promise',
  PeekPromise: 'promise',
  CompletePromise: 'promise',
};

const CHAIN_COMMANDS_COMPONENTS: {
  [K in CommandEntryType]:
    | Record<NonNullable<JournalEntryV2['resultType']>, string>
    | undefined;
} = {
  Input: undefined,
  GetState: undefined,
  GetEagerState: undefined,
  SetState: undefined,
  GetStateKeys: undefined,
  GetEagerStateKeys: undefined,
  ClearState: undefined,
  ClearAllState: undefined,
  Call: undefined,
  Run: undefined,
  Output: undefined,
  OneWayCall: undefined,
  Sleep: undefined,
  CompleteAwakeable: { failure: 'reject', success: 'resolve', void: '' },
  Awakeable: undefined,
  AttachInvocation: undefined,
  Cancel: undefined,
  GetPromise: undefined,
  PeekPromise: undefined,
  CompletePromise: { failure: 'reject', success: 'resolve', void: '' },
};
const styles = tv({ base: 'mr-2 overflow-hidden pr-0' });

export function EntryExpression({
  entry,
  invocation,
  input: propInput,
  output: propOutput,
  inputParams,
  outputParam,
  name,
  operationSymbol,
  chain,
  className,
  outputParamPlaceholder = 'Result',
  hideErrorForFailureResult,
  isOutputBase64,
}: {
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  entry?: JournalEntryV2;
  input?: ReactNode;
  output?: ReactNode;
  inputParams?: {
    paramName: string;
    placeholderLabel: string;
    title: string;
    isArray?: boolean;
    shouldStringified?: boolean;
    isBase64?: boolean;
  }[];
  outputParam?: string;
  outputParamPlaceholder?: string;
  isOutputBase64?: boolean;
  name?: string;
  operationSymbol?: string;
  chain?: ReactNode;
  className?: string;
  hideErrorForFailureResult?: boolean;
}) {
  const { EncodingWaterMark } = useRestateContext();

  if (
    !entry ||
    (entry?.category !== 'command' &&
      !['CompleteAwakeable', 'Cancel'].includes(String(entry?.type)))
  ) {
    return null;
  }

  const input =
    propInput ||
    inputParams
      ?.filter(
        (param) =>
          (entry as any)[param.paramName] &&
          (!param.isArray || (entry as any)[param.paramName].length > 0),
      )
      .map((param) => {
        const paramValue = (entry as any)[param.paramName];

        const displayedValuedPlaceholder =
          typeof paramValue !== 'undefined' ? (
            typeof paramValue === 'string' && !param.shouldStringified ? (
              paramValue
            ) : (
              JSON.stringify(paramValue)
            )
          ) : (
            <span className="block bg-white">{param.placeholderLabel}</span>
          );
        return (
          <InputOutput
            name={displayedValuedPlaceholder}
            popoverTitle={param.title}
            popoverContent={
              <Value
                value={paramValue}
                className="py-3 font-mono text-xs"
                isBase64={param.isBase64}
              />
            }
            key={param.paramName}
            {...(EncodingWaterMark &&
              param.isBase64 && {
                waterMark: <EncodingWaterMark value={paramValue} />,
              })}
          />
        );
      })
      .reduce((p, c) => {
        if (p.length === 0) {
          return [c];
        }
        return [...p, ', ', c];
      }, [] as ReactNode[]);

  const output =
    propOutput ||
    (outputParam && (
      <>
        {typeof (entry as any)[outputParam] === 'string' && (
          <InputOutput
            name={outputParam}
            isValueHidden
            popoverTitle={outputParamPlaceholder}
            popoverContent={
              <Value
                value={(entry as any)[outputParam]}
                className="py-3 font-mono text-xs"
                isBase64={isOutputBase64}
              />
            }
            {...(EncodingWaterMark &&
              isOutputBase64 && {
                waterMark: (
                  <EncodingWaterMark value={(entry as any)[outputParam]} />
                ),
              })}
          />
        )}
        {(entry as any)[outputParam] &&
          Array.isArray((entry as any)[outputParam]) && (
            <InputOutput
              name={outputParam}
              isValueHidden
              popoverTitle={outputParamPlaceholder}
              popoverContent={
                <Value
                  value={JSON.stringify((entry as any)[outputParam])}
                  className="py-3 font-mono text-xs"
                  isBase64={isOutputBase64}
                  {...(EncodingWaterMark &&
                    isOutputBase64 && {
                      waterMark: (
                        <EncodingWaterMark
                          value={JSON.stringify((entry as any)[outputParam])}
                        />
                      ),
                    })}
                />
              }
            />
          )}
        {((typeof (entry as any)[outputParam] === 'undefined' &&
          entry.resultType === 'success') ||
          entry.resultType === 'void') && (
          <div className="font-normal text-zinc-400">void</div>
        )}
        <div className="comma hidden text-gray-400">,</div>
      </>
    ));

  const { isAmbiguous: entryCompletionIsAmbiguous, mode } =
    isEntryCompletionAmbiguous(entry, invocation);

  // TODO: move to middleware
  const isPending =
    entry?.isPending &&
    !entryCompletionIsAmbiguous &&
    !(
      entry.type === 'Run' &&
      entry.category === 'command' &&
      invocation?.status !== 'running'
    );

  return (
    <Expression
      namePrefix={''}
      name={
        NAME_COMMANDS_COMPONENTS[entry.type as CommandEntryType] || name || ''
      }
      operationSymbol={operationSymbol}
      prefix={
        entry.type === 'Output'
          ? entry.error
            ? 'throws'
            : 'return '
          : undefined
      }
      {...(entry?.resultType && {
        chain:
          CHAIN_COMMANDS_COMPONENTS[entry.type as CommandEntryType]?.[
            entry.resultType
          ],
      })}
      className={styles({ className })}
      isFunction={entry.type !== 'Output'}
      input={input}
      output={
        <>
          {entryCompletionIsAmbiguous && (
            <HoverTooltip
              content={
                mode === 'paused'
                  ? 'Invocation is paused!'
                  : 'Completion not detected!'
              }
            >
              <Icon
                name={mode === 'paused' ? IconName.Pause : IconName.ClockAlert}
                className="h-3 w-3 opacity-80"
              />
            </HoverTooltip>
          )}
          {isPending && <Ellipsis />}
          <div className="[&:has(+.comma+*)>.comma]:block" />
          {output}
          {entry.error &&
            (!hideErrorForFailureResult || entry.resultType !== 'failure') && (
              <div className="ml-1 min-w-6 text-2xs">
                <Failure
                  message={entry.error.message!}
                  restate_code={entry.error.restateCode}
                  isRetrying={entry.isRetrying}
                  className="w-full"
                />
              </div>
            )}
        </>
      }
      chain={chain}
    />
  );
}
