import { PopoverOverlay } from '@restate/ui/popover';
import type { PropsWithChildren } from 'react';
import { Placement } from 'react-aria';
import { tv } from '@restate/util/styles';

interface DropdownPopoverProps {
  className?: string;
  placement?: Placement;
}

const styles = tv({
  base: 'w-fit max-w-[90vw] min-w-[max(var(--trigger-width),150px)] rounded-2xl lg:max-w-[50vw]',
});

export function DropdownPopover({
  children,
  className,
  ...props
}: PropsWithChildren<DropdownPopoverProps>) {
  return (
    <PopoverOverlay className={styles({ className })} {...props}>
      <div className="relative overflow-auto rounded-2xl bg-gray-100 outline-hidden">
        {children}
      </div>
    </PopoverOverlay>
  );
}
