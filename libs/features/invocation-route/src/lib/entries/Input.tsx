import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { InputOutput } from '../Expression';
import { Headers } from '../Headers';
import { Value } from '../Value';
import { Target } from '../Target';
import { tv } from 'tailwind-variants';
import { EntryExpression } from './EntryExpression';

const inputStyles = tv({
  base: '[font-size:inherit] [&_[data-target]]:font-medium -translate-y-px [&_[data-target]]:font-sans  shadow-none self-start  ring-0 [--rounded-radius-right:calc(1rem-1px)] [--rounded-radius:calc(1rem-1px)] [&&&>*:last-child>*]:rounded-b-none',
  variants: {
    hasEntryAfterInput: {
      true: '[&&&&]:rounded-b-none [&&&&_a:before]:rounded-b-none  h-[calc(2.25rem-1px)]  [&_[data-target]]:h-[calc(2.25rem-1px)]',
      false: 'h-9  [&_[data-target]>*]:h-9',
    },
  },
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
        hasEntryAfterInput: Boolean(
          invocation?.journal_commands_size &&
            invocation.journal_commands_size > 1
        ),
      })}
    >
      {entry ? (
        <>
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
        </>
      ) : null}
    </Target>
  );
}
