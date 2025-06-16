import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';

export function CompletionNotification({
  entry,
  children,
  commandIndex,
  index,
}: PropsWithChildren<{
  entry: JournalEntryV2;
  commandIndex: number;
  index: number;
}>) {
  return (
    <div className="flex item-center gap-2">
      <Badge
        variant={entry.resultType === 'failure' ? 'danger' : 'success'}
        size="sm"
        className="font-sans font-normal gap-1 px-0 py-0 "
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
              className="px-3 py-2 text-code"
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
              <div className="text-2xs">
                <Failure
                  restate_code={entry.error?.restateCode}
                  message={entry.error?.message ?? ''}
                  className="bg-transparent border-none shadow-none py-0 hover:bg-red-100 pressed:bg-red-200/70 rounded-md translate-x-px"
                />
              </div>
            )}
          </>
        ) : (
          <div className="mr-2">Completed</div>
        )}
      </Badge>
    </div>
  );
}
