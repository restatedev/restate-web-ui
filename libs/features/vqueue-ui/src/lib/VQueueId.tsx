import { useGetVqueue } from '@restate/data-access/admin-api-hooks';
import type { InvocationSummaryStage } from '@restate/data-access/admin-api-spec';
import { Button } from '@restate/ui/button';
import { Copy } from '@restate/ui/copy';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import { useState } from 'react';
import type { Placement } from 'react-aria';
import { VQueueIdDisplay, type VQueueIdDisplayProps } from './VQueueIdDisplay';
import {
  VQueuePopoverContent,
  type VQueueEntryIdRenderer,
} from './VQueuePopoverContent';

const triggerStyles = tv({
  base: 'max-w-full min-w-0 justify-start gap-1 rounded-lg p-0 pr-1 text-left text-xs font-medium shadow-none hover:bg-black/5 pressed:bg-black/10',
  variants: {
    size: {
      sm: '',
      md: '',
      default: '',
      icon: 'w-fit',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const popoverContentStyles = tv({
  base: 'w-fit',
  variants: {
    compact: {
      true: 'w-[min(24rem,calc(100vw-2rem))]',
      false:
        'max-w-[min(48rem,calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))]',
    },
  },
});

export interface VQueueIdProps extends VQueueIdDisplayProps {
  focusEntryId?: string;
  focusStage?: InvocationSummaryStage;
  popover?: boolean;
  placement?: Placement;
  renderEntryId?: VQueueEntryIdRenderer;
}

interface VQueueFallbackContentProps {
  id: string;
  loading: boolean;
  message: string;
}

function VQueueFallbackContent({
  id,
  loading,
  message,
}: VQueueFallbackContentProps) {
  return (
    <div className="w-full min-w-0 bg-gray-100 px-0.5 pt-0.5 text-zinc-700">
      <DropdownSection
        className="overflow-hidden"
        headerClassName="pr-1 pl-2"
        title={
          <div className="flex min-w-0 items-center gap-2">
            <VQueueIdDisplay
              id={id}
              size="md"
              className="min-w-0 shrink font-normal"
            />
            <Copy
              copyText={id}
              className="ml-0 h-5 w-5 shrink-0 rounded-md p-1 text-gray-500"
            />
          </div>
        }
      >
        <div
          role={loading ? 'status' : undefined}
          className="flex min-h-12 items-center justify-start gap-2 bg-white px-4 py-3 text-xs text-gray-500"
        >
          {loading && <Spinner className="h-4 w-4 shrink-0" />}
          <span>{message}</span>
        </div>
      </DropdownSection>
    </div>
  );
}

function VQueueIdWithPopover({
  id,
  focusEntryId,
  focusStage,
  className,
  size = 'default',
  truncateInMiddle,
  placement = 'bottom',
  renderEntryId,
}: VQueueIdProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, error, isFetching } = useGetVqueue(id, focusEntryId, {
    enabled: isOpen,
    staleTime: 0,
  });
  const freshData = !isFetching && !error ? data : undefined;
  const selectedStage = freshData?.focusEntry?.stage ?? focusStage;
  const compact = Boolean(selectedStage && selectedStage !== 'inbox');

  return (
    <Popover onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button variant="icon" className={triggerStyles({ size, className })}>
          <span className="sr-only">Open VQueue {id}</span>
          <VQueueIdDisplay
            id={id}
            size={size}
            truncateInMiddle={truncateInMiddle}
            showTooltip={false}
            aria-hidden
          />
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 shrink-0 text-zinc-400"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        placement={placement}
        className={popoverContentStyles({ compact })}
      >
        {freshData ? (
          <VQueuePopoverContent
            data={freshData}
            focusStage={focusStage}
            renderEntryId={renderEntryId}
          />
        ) : (
          <VQueueFallbackContent
            id={id}
            loading={isFetching}
            message={
              isFetching
                ? 'Loading VQueue…'
                : error
                  ? 'Unable to load VQueue'
                  : 'VQueue details unavailable'
            }
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export function VQueueId({
  popover = true,
  renderEntryId,
  ...props
}: VQueueIdProps) {
  return popover ? (
    <VQueueIdWithPopover {...props} renderEntryId={renderEntryId} />
  ) : (
    <VQueueIdDisplay {...props} />
  );
}
