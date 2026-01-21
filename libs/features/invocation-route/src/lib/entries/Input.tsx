import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { EntryProps } from './types';
import { Target } from '../Target';
import { tv } from '@restate/util/styles';
import { EntryExpression } from './EntryExpression';
import { Icon, IconName } from '@restate/ui/icons';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

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
  return (
    <Target
      target={invocation?.target}
      showHandler={!entry}
      className={inputStyles({
        className,
      })}
    >
      {entry ? (
        <div className="flex translate-y-px items-center">
          <Icon
            name={IconName.Function}
            className="-mr-0.5 h-5 w-5 shrink-0 text-zinc-400"
          />
          <EntryExpression
            entry={entry}
            invocation={invocation}
            name={invocation?.target_handler_name}
            operationSymbol={''}
            input={
              <LazyJournalEntryPayload.Input
                invocationId={invocation?.id}
                entry={entry}
                title="Input"
                isBase64
              />
            }
          />
          <div data-fill />
        </div>
      ) : null}
    </Target>
  );
}
