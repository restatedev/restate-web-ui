import {
  JournalEntryV2,
  useGetInvocationJournalWithInvocationV2,
} from '@restate/data-access/admin-api';
import { Expression, InputOutput } from '../Expression';
import { CommandEntryType } from './types';
import { ReactNode } from 'react';
import { Ellipsis } from '@restate/ui/loading';
import { Failure } from '../Failure';
import { Value } from '../Value';
import { tv } from 'tailwind-variants';

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
const styles = tv({ base: 'pr-0 overflow-hidden' });

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
  }[];
  outputParam?: string;
  outputParamPlaceholder?: string;
  name?: string;
  operationSymbol?: string;
  chain?: ReactNode;
  className?: string;
  hideErrorForFailureResult?: boolean;
}) {
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
          (!param.isArray || (entry as any)[param.paramName].length > 0)
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
            <span className="bg-white block">{param.placeholderLabel}</span>
          );
        return (
          <InputOutput
            name={displayedValuedPlaceholder}
            popoverTitle={param.title}
            popoverContent={
              <Value value={paramValue} className="text-xs font-mono py-3" />
            }
            key={param.paramName}
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
                className="text-xs font-mono py-3"
              />
            }
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
                  className="text-xs font-mono py-3"
                />
              }
            />
          )}
        {((typeof (entry as any)[outputParam] === 'undefined' &&
          entry.resultType === 'success') ||
          entry.resultType === 'void') && (
          <div className="text-zinc-400 font-semibold">void</div>
        )}
        <div className="text-gray-400 [&:has(+*)]:block hidden">,</div>
      </>
    ));

  return (
    <Expression
      namePrefix={
        ['Input', 'Output'].includes(String(entry.type)) ? '' : 'ctx.'
      }
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
          {entry.isPending && <Ellipsis />}
          {output}
          {entry.error &&
            (!hideErrorForFailureResult || entry.resultType !== 'failure') && (
              <div className="text-2xs ml-1">
                <Failure
                  message={entry.error.message!}
                  restate_code={entry.error.restateCode}
                  isRetrying={entry.isRetrying}
                />
              </div>
            )}
        </>
      }
      chain={chain}
    />
  );
}
