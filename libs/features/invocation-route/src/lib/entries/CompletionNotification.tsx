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
    <div className="flex item-center gap-2 mr-2">
      <Badge
        variant={entry.resultType === 'failure' ? 'danger' : 'success'}
        size="sm"
        className="font-sans font-normal gap-1 px-0 py-0 rounded-lg text-2xs"
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
        {entry.resultType === 'failure' ? (
          <>
            Failed{' '}
            {entry.error && (
              <div className="text-2xs font-mono">
                <Failure
                  restate_code={entry.error?.restateCode}
                  message={entry.error?.message ?? ''}
                  className="bg-transparent border-none shadow-none py-0 hover:bg-red-100 pressed:bg-red-200/70 [&_button]:h-5 my-[-2px]"
                />
              </div>
            )}
          </>
        ) : (
          <div className="mr-2 ">Completed</div>
        )}
      </Badge>
      <TimelinePortal invocationId={invocation?.id ?? ''} entry={entry}>
        <div className="h-9 border-b border-transparent w-full relative">
          <EntryProgress entry={entry} invocation={invocation} />
        </div>
      </TimelinePortal>
    </div>
  );
}
