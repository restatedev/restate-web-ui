import { Invocation, JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { ComponentType } from 'react';
import { Badge } from '@restate/ui/badge';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';
import { CommandEntryType, EntryProps } from './types';

export function CompletionNotification({
  entry,
  parentCommand,
  invocation,
  commandComponents,
}: {
  entry: JournalEntryV2;
  parentCommand?: JournalEntryV2;
  invocation?: Invocation;
  commandComponents: {
    [K in CommandEntryType]:
      | ComponentType<
          EntryProps<
            Extract<JournalEntryV2, { type?: K; category?: 'command' }>
          >
        >
      | undefined;
  };
}) {
  const commandIndex = parentCommand?.commandIndex;
  const CommandComponent = parentCommand?.type
    ? (commandComponents[parentCommand.type as CommandEntryType] as
        | ComponentType<EntryProps<JournalEntryV2>>
        | undefined)
    : undefined;

  return (
    <div className="item-center mr-2 flex gap-2">
      <Badge
        variant={entry.resultType === 'failure' ? 'danger' : 'success'}
        size="sm"
        className="gap-1 truncate rounded-md px-0 py-0 font-sans text-2xs font-normal"
      >
        {parentCommand && typeof commandIndex === 'number' && (
          <Popover>
            <PopoverTrigger>
              <Button
                className="my-[-0.5px] translate-x-[-0.5px] rounded-md px-1 py-0 font-mono text-xs text-gray-400"
                variant="secondary"
              >
                <div className="flex h-5 items-center">#{commandIndex}</div>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownSection
                className="relative px-3 py-2 pr-8 text-0.5xs"
                title={
                  <span className="text-2xs text-gray-400 uppercase">{`Command #${commandIndex}`}</span>
                }
              >
                {CommandComponent && (
                  <CommandComponent
                    entry={parentCommand}
                    invocation={invocation}
                  />
                )}
              </DropdownSection>
            </PopoverContent>
          </Popover>
        )}
        {entry.resultType === 'failure' ? (
          <LazyJournalEntryPayload.Failure
            invocationId={invocation?.id}
            entry={entry}
            className="my-[-2px] border-none bg-transparent py-0 text-2xs shadow-none hover:bg-red-100 pressed:bg-red-200/70 [&_button]:h-5"
          />
        ) : (
          <div className="mr-2">Completed</div>
        )}
      </Badge>
    </div>
  );
}
