import { Popover } from '@restate/ui/popover';
import type { PropsWithChildren } from 'react';

interface DropdownPopoverProps {}

export function DropdownPopover({
  children,
}: PropsWithChildren<DropdownPopoverProps>) {
  return <Popover className="min-w-[150px]">{children}</Popover>;
}
