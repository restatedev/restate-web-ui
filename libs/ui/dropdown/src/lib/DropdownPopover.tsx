import { PopoverContent } from '@restate/ui/popover';
import type { PropsWithChildren } from 'react';
import { Placement } from 'react-aria';
import { tv } from 'tailwind-variants';

interface DropdownPopoverProps {
  className?: string;
  placement?: Placement;
}

const styles = tv({
  base: 'min-w-[150px]',
});

export function DropdownPopover({
  children,
  className,
  ...props
}: PropsWithChildren<DropdownPopoverProps>) {
  return (
    <PopoverContent className={styles({ className })} {...props}>
      {children}
    </PopoverContent>
  );
}
