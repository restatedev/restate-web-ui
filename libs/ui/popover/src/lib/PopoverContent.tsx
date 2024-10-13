import { PropsWithChildren } from 'react';
import { Dialog as AriaDialog } from 'react-aria-components';
import { PopoverOverlay } from './PopoverOverlay';

export function PopoverContent({
  children,
  className,
  ...props
}: PropsWithChildren<{ className?: string }>) {
  return (
    <PopoverOverlay className="rounded-[1rem]">
      <AriaDialog className="outline bg-gray-100 rounded-[1rem] outline-0 overflow-auto relative">
        {children}
      </AriaDialog>
    </PopoverOverlay>
  );
}
