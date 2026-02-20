import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { EntryProps } from './types';
import { ENTRY_EVENTS_ENTRY_LABELS } from '../EntryTooltip';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { ENTRY_COMMANDS_COMPONENTS } from '../Entry';
import { ComponentType } from 'react';

export function LifeCycle({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Killed'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>
>) {
  const isPaused = entry.type === 'Paused';

  if (isPaused) {
    const commandIndex = entry.relatedCommandIndex;
    const parentCommand =
      typeof commandIndex === 'number'
        ? invocation?.journal?.entries?.find(
            (e) => e.category === 'command' && e.commandIndex === commandIndex,
          )
        : undefined;
    const CommandComponent = parentCommand?.type
      ? (ENTRY_COMMANDS_COMPONENTS[
          parentCommand.type as keyof typeof ENTRY_COMMANDS_COMPONENTS
        ] as ComponentType<EntryProps<JournalEntryV2>> | undefined)
      : undefined;

    const hasError = Boolean(entry.code || entry.message || entry.error);
    return (
      <div className="-order-1 mr-2 flex items-center gap-2 font-sans text-zinc-500">
        <span className="shrink-0">
          {hasError ? ENTRY_EVENTS_ENTRY_LABELS['Paused'] : 'Paused'}
        </span>
        {hasError && (
          <Badge
            variant="warning"
            size="sm"
            className="gap-0 truncate px-0 font-sans font-normal"
          >
            {parentCommand && typeof commandIndex === 'number' && (
              <Popover>
                <PopoverTrigger>
                  <Button
                    className="-my-1 translate-x-[-0.5px] rounded-md px-1 py-0 font-mono text-xs text-gray-400"
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
            <Failure
              title="Paused after"
              restate_code={String(
                entry.relatedRestateErrorCode ||
                  entry.code ||
                  entry?.error?.restateCode ||
                  entry?.error?.code ||
                  '',
              )}
              stacktrace={entry?.stack || entry?.error?.stack}
              message={[entry.message, entry?.error?.message]
                .filter(Boolean)
                .join('\n\n')}
              isRetrying
              className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
            />
          </Badge>
        )}
      </div>
    );
  }
  return (
    <div className="mr-2 flex gap-1 font-sans text-zinc-500">
      {{ ...ENTRY_EVENTS_ENTRY_LABELS }[String(entry.type)]}
    </div>
  );
}
