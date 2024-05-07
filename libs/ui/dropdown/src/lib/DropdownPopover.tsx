import { Popover } from '@restate/ui/popover';
import type { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface DropdownPopoverProps {
  className?: string;
}

const styles = tv({
  base: 'min-w-[150px]',
});

export function DropdownPopover({
  children,
  className,
}: PropsWithChildren<DropdownPopoverProps>) {
  return <Popover className={styles({ className })}>{children}</Popover>;
}
