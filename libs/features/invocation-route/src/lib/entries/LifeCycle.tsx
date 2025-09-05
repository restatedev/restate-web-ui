import { JournalEntryV2 } from '@restate/data-access/admin-api';
import {
  CommandEntryType,
  EntryProps,
  EventEntryType,
  NotificationEntryType,
} from './types';
import { ENTRY_EVENTS_TITLES } from '../EntryTooltip';
import { Badge } from '@restate/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Failure } from '../Failure';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import {
  ENTRY_COMMANDS_COMPONENTS,
  ENTRY_EVENTS_COMPONENTS,
  ENTRY_NOTIFICATIONS_COMPONENTS,
} from '../Entry';
import { ComponentType } from 'react';

export function LifeCycle({
  entry,
  invocation,
}: EntryProps<
  | Extract<JournalEntryV2, { type?: 'Created'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Pending'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Scheduled'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Completion'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Suspended'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Running'; category?: 'event' }>
  | Extract<JournalEntryV2, { type?: 'Retrying'; category?: 'event' }>
>) {
  const isPaused = entry.type === 'Paused';
  const { data } = useGetInvocationJournalWithInvocationV2(
    invocation?.id ?? '',
    {
      enabled: Boolean(invocation?.id),
      refetchOnMount: false,
    },
  );
  if (isPaused) {
    const relatedEntry = data?.journal?.entries?.find(
      (relatedEntry) =>
        typeof entry.relatedCommandIndex === 'number' &&
        relatedEntry.commandIndex === entry.relatedCommandIndex,
    );
    const EntrySpecificComponent = (
      relatedEntry?.type
        ? relatedEntry?.category === 'command'
          ? ENTRY_COMMANDS_COMPONENTS[relatedEntry.type as CommandEntryType]
          : relatedEntry?.category === 'notification'
            ? ENTRY_NOTIFICATIONS_COMPONENTS[
                relatedEntry.type as NotificationEntryType
              ]
            : ENTRY_EVENTS_COMPONENTS[relatedEntry.type as EventEntryType]
        : undefined
    ) as ComponentType<EntryProps<JournalEntryV2>> | undefined;

    return (
      <div className="mr-2 flex items-center gap-2 font-sans text-zinc-500">
        Paused after
        <Badge
          variant="warning"
          size="sm"
          className="gap-0 px-0 py-0 font-sans font-normal"
        >
          {relatedEntry && EntrySpecificComponent && (
            <Popover>
              <PopoverTrigger>
                <Button
                  className="my-[-0.5px] translate-x-[-0.5px] rounded-md px-1 py-0 font-mono text-xs text-gray-400"
                  variant="secondary"
                >
                  <div className="flex h-5 items-center">
                    #{relatedEntry.commandIndex}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <DropdownSection
                  className="relative px-3 py-2 pr-8 text-0.5xs"
                  title={
                    <span className="text-2xs text-gray-400 uppercase">{`Command #${relatedEntry.commandIndex}`}</span>
                  }
                >
                  <EntrySpecificComponent
                    entry={relatedEntry}
                    invocation={invocation}
                  />
                </DropdownSection>
              </PopoverContent>
            </Popover>
          )}
          <div className="font-mono text-2xs">
            <Failure
              title="Last failure"
              restate_code={String(
                entry.relatedRestateErrorCode ||
                  entry.code ||
                  entry?.error?.restateCode ||
                  entry?.error?.code ||
                  '',
              )}
              message={[entry.message, entry?.error?.message, entry.stackTrace]
                .filter(Boolean)
                .join('\n\n')}
              isRetrying
              className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
            />
          </div>
        </Badge>
      </div>
    );
  }
  return (
    <div className="mr-2 font-sans text-zinc-500">
      {{ ...ENTRY_EVENTS_TITLES }[String(entry.type)]}
    </div>
  );
}
