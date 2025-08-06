import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { tv } from 'tailwind-variants';
import { EntryExpression } from './EntryExpression';
import { Icon, IconName } from '@restate/ui/icons';

const inputStyles = tv({
  base: 'target [font-size:inherit] border-b border-t border-white h-12 [&_[data-target]>*]:h-12 [&]:rounded-r-none **:data-target:font-medium **:data-target:font-sans  shadow-none self-start  ring-0 [--rounded-radius-right:0px] [--rounded-radius:calc(1rem-1px)] [&&&>*:last-child>*]:rounded-r-none',
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
  return (
    <Target
      target={invocation?.target}
      showHandler={!entry}
      className={inputStyles({
        className,
      })}
    >
      {entry ? (
        <div className="flex items-center ">
          <Icon
            name={IconName.Function}
            className="w-4 h-4 text-zinc-400 shrink-0 -mr-0.5"
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
          <div data-fill />
        </div>
      ) : null}
    </Target>
  );
}
