import { Invocation, JournalEntryV2 } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';
import { TimelinePortal } from '../Portals';
import { EntryProgress } from '../EntryProgress';
import { EntryProps } from './types';

function isTransientError(
  entry: JournalEntryV2,
): entry is Extract<
  JournalEntryV2,
  { type?: 'Event: TransientError'; category?: 'event' }
> {
  return entry.type === 'Event: TransientError' && entry.category === 'event';
}

function isPausedError(
  entry: JournalEntryV2,
): entry is Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }> {
  return entry.type === 'Paused' && entry.category === 'event';
}

export function TransientError({
  entry,
  children,
  commandIndex,
  index,
  invocation,
}: PropsWithChildren<{
  entry: JournalEntryV2;
  commandIndex: number;
  index: number;
  invocation?: Invocation;
}>) {
  if (isTransientError(entry) || isPausedError(entry)) {
    return (
      <div className="item-center mr-2 flex gap-2">
        <Badge
          variant="warning"
          size="sm"
          className="gap-0 truncate px-0 py-0 font-sans font-normal"
        >
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
                {children}
              </DropdownSection>
            </PopoverContent>
          </Popover>
          <Failure
            restate_code={String(
              entry.relatedRestateErrorCode ||
                entry.code ||
                entry?.error?.restateCode ||
                entry?.error?.code ||
                '',
            )}
            message={Array.from(new Set([entry.message, entry?.error?.message]))
              .filter(Boolean)
              .join('\n\n')}
            isRetrying
            className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 text-2xs shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
          />
        </Badge>
        <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
          <EntryProgress entry={entry} invocation={invocation} />
        </TimelinePortal>
      </div>
    );
  }

  return null;
}

export function NoCommandTransientError({
  entry,
  invocation,
}: EntryProps<
  Extract<
    JournalEntryV2,
    { type?: 'Event: TransientError'; category?: 'event' }
  >
>) {
  if (
    isTransientError(entry) &&
    (entry.relatedCommandIndex === undefined ||
      !invocation?.journal?.entries?.some(
        (e) =>
          e.commandIndex === entry.relatedCommandIndex &&
          Number(e.index) < Number(entry.index),
      ))
  ) {
    return (
      <div className="item-center mr-2 flex gap-2">
        <Badge
          variant="warning"
          size="sm"
          className="gap-0 truncate px-0 py-0.5 font-sans font-normal"
        >
          <Failure
            restate_code={String(
              entry.relatedRestateErrorCode ||
                entry.code ||
                entry?.error?.restateCode ||
                entry?.error?.code ||
                '',
            )}
            message={[entry.message, entry?.error?.message]
              .filter(Boolean)
              .join('\n\n')}
            isRetrying
            className="my-[-2px] ml-0 h-5 rounded-md border-none bg-transparent py-0 text-2xs shadow-none hover:bg-orange-100 pressed:bg-orange-200/50"
          />
        </Badge>
        <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
          <EntryProgress entry={entry} invocation={invocation} />
        </TimelinePortal>
      </div>
    );
  }

  return null;
}
