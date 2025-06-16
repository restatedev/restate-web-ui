import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';
import { Badge } from '@restate/ui/badge';
import { Failure } from '../Failure';

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
}: PropsWithChildren<{
  entry: JournalEntryV2;
  commandIndex: number;
  index: number;
}>) {
  if (isTransientError(entry)) {
    return (
      <div className="flex item-center gap-2">
        <Badge variant="warning" size="sm" className="aa gap-1 px-0 py-0 ">
          <Popover>
            <PopoverTrigger>
              <Button
                className="h-5 rounded-md text-gray-500 text-xs py-0 px-1 text-gray-400 -translate-x-px -my-px"
                variant="secondary"
              >
                #{commandIndex}
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
          Retryable error
          <div className="text-2xs">
            <Failure
              restate_code={entry.relatedRestateErrorCode}
              message={entry.stackTrace ?? entry.stackTrace ?? ''}
              isRetrying
              className="bg-transparent border-none shadow-none"
            />
          </div>
        </Badge>
      </div>
    );
  }

  return null;
}
