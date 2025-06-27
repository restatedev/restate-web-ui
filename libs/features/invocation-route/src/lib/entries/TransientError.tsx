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
  entry: JournalEntryV2
): entry is Extract<
  JournalEntryV2,
  { type?: 'TransientError'; category?: 'event' }
> {
  return entry.type === 'TransientError' && entry.category === 'event';
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
  if (isTransientError(entry)) {
    return (
      <div className="flex item-center gap-2 mr-2">
        <Badge
          variant="warning"
          size="sm"
          className="font-sans font-normal gap-0 px-0 py-0 "
        >
          <Popover>
            <PopoverTrigger>
              <Button
                className=" font-mono rounded-md text-xs py-0 px-1 text-gray-400 translate-x-[-0.5px] my-[-0.5px]"
                variant="secondary"
              >
                <div className="h-5 flex items-center">#{commandIndex}</div>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownSection
                className="px-3 py-2 text-code relative pr-8"
                title={
                  <span className="text-2xs uppercase text-gray-400">{`Command #${commandIndex}`}</span>
                }
              >
                {children}
              </DropdownSection>
            </PopoverContent>
          </Popover>
          <div className="text-2xs font-mono">
            <Failure
              restate_code={entry.relatedRestateErrorCode ?? String(entry.code)}
              message={
                entry.stackTrace ??
                entry.message + '\n\n' + entry.stackTrace ??
                entry.message
              }
              isRetrying
              className="bg-transparent ml-0 border-none shadow-none py-0 hover:bg-orange-100 pressed:bg-orange-200/50 rounded-md my-[-2px] h-5"
            />
          </div>
        </Badge>
        <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
          <div className="h-9 border-b border-transparent w-full relative">
            <EntryProgress entry={entry} invocation={invocation} />
          </div>
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
  Extract<JournalEntryV2, { type?: 'TransientError'; category?: 'event' }>
>) {
  if (isTransientError(entry) && entry.relatedCommandIndex === undefined) {
    return (
      <div className="flex item-center gap-2 mr-2">
        <Badge
          variant="warning"
          size="sm"
          className="font-sans font-normal gap-0 px-0 py-0.5"
        >
          <div className="text-2xs font-mono">
            <Failure
              restate_code={String(
                entry.relatedRestateErrorCode ||
                  entry.code ||
                  entry?.error?.restateCode ||
                  entry?.error?.code ||
                  ''
              )}
              message={
                entry.stackTrace ??
                [entry.message, entry?.error?.message, entry.stackTrace]
                  .filter(Boolean)
                  .join('\n\n')
              }
              isRetrying
              className="bg-transparent ml-0 border-none shadow-none py-0 hover:bg-orange-100 pressed:bg-orange-200/50 rounded-md my-[-2px] h-5"
            />
          </div>
        </Badge>
        <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
          <div className="h-9 border-b border-transparent w-full relative">
            <EntryProgress entry={entry} invocation={invocation} />
          </div>
        </TimelinePortal>
      </div>
    );
  }

  return null;
}
