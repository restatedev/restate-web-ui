import { Invocation, JournalEntryV2 } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';
import { TimelinePortal } from '../Portals';
import { EntryProgress } from '../EntryProgress';

export function CompletionNotification({
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
  return (
    <div className="item-center mr-2 flex gap-2">
      <Badge
        variant={entry.resultType === 'failure' ? 'danger' : 'success'}
        size="sm"
        className="gap-1 truncate rounded-md px-0 py-0 font-sans text-2xs font-normal"
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
        {entry.resultType === 'failure' ? (
          <>
            {entry.error && (
              <Failure
                restate_code={entry.error?.restateCode}
                message={entry.error?.message ?? 'Failed'}
                className="my-[-2px] border-none bg-transparent py-0 text-2xs shadow-none hover:bg-red-100 pressed:bg-red-200/70 [&_button]:h-5"
              />
            )}
          </>
        ) : (
          <div className="mr-2">Completed</div>
        )}
      </Badge>
      <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
        <div className="relative h-9 w-full border-b border-transparent">
          <EntryProgress entry={entry} invocation={invocation} />
        </div>
      </TimelinePortal>
    </div>
  );
}
