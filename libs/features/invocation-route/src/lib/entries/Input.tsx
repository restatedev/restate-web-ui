import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { tv } from '@restate/util/styles';
import { EntryExpression } from './EntryExpression';
import { Icon, IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';

const inputStyles = tv({
  base: 'target h-12 self-start border-t border-b border-white [font-size:inherit] shadow-none ring-0 [--rounded-radius-right:0px] [--rounded-radius:calc(1rem-1px)] **:data-target:font-sans **:data-target:font-medium [&]:rounded-r-none [&_[data-target]>*]:h-12 [&&&>*:last-child>*]:rounded-r-none',
});

export function Input({
  entry,
  failed,
  invocation,
  isRetrying,
  wasRetrying,
  className,
}: Partial<
  EntryProps<Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>>
>) {
  const { EncodingWaterMark } = useRestateContext();
  return (
    <Target
      target={invocation?.target}
      showHandler={!entry}
      className={inputStyles({
        className,
      })}
    >
      {entry ? (
        <div className="flex items-center">
          <Icon
            name={IconName.Function}
            className="-mr-0.5 h-4 w-4 shrink-0 text-zinc-400"
          />
          <EntryExpression
            entry={entry}
            invocation={invocation}
            name={invocation?.target_handler_name}
            operationSymbol={''}
            input={
              <>
                {entry.parameters && (
                  <InputOutput
                    name="parameters"
                    popoverTitle="Parameters"
                    popoverContent={
                      <Value
                        value={entry.parameters}
                        className="py-3 font-mono text-xs"
                        isBase64
                        showCopyButton
                        portalId="expression-value"
                      />
                    }
                    {...(EncodingWaterMark && {
                      waterMark: <EncodingWaterMark value={entry.parameters} />,
                    })}
                  />
                )}
                {entry.parameters &&
                  entry.headers &&
                  entry.headers.length > 0 &&
                  ', '}
                {entry.headers && entry.headers.length > 0 && (
                  <InputOutput
                    name="headers"
                    popoverTitle="Headers"
                    className="mx-0 border-none bg-transparent px-0 [&&&]:mb-0"
                    popoverContent={
                      <Headers
                        headers={entry.headers}
                        showCopyButton
                        portalId="expression-value"
                      />
                    }
                  />
                )}
              </>
            }
          />
          <div data-fill />
        </div>
      ) : null}
    </Target>
  );
}
