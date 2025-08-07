import { PropsWithChildren, RefObject } from 'react';
import { Dialog as AriaDialog } from 'react-aria-components';
import { PopoverOverlay } from './PopoverOverlay';
import { tv } from 'tailwind-variants';
import { Placement } from 'react-aria';

const styles = tv({
  base: 'rounded-2xl',
});
export function PopoverContent({
  children,
  className,
  ...props
}: PropsWithChildren<{
  className?: string;
  triggerRef?: RefObject<Element | null>;
  placement?: Placement;
}>) {
  return (
    <PopoverOverlay {...props} className={styles({ className })}>
      <AriaDialog className="relative overflow-auto rounded-2xl bg-gray-100 outline outline-0">
        {children}
      </AriaDialog>
    </PopoverOverlay>
  );
}
