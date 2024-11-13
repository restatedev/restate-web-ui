import { PropsWithChildren } from 'react';
import { Dialog as AriaDialog } from 'react-aria-components';
import { PopoverOverlay } from './PopoverOverlay';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'rounded-[1rem]',
});
export function PopoverContent({
  children,
  className,
  ...props
}: PropsWithChildren<{ className?: string }>) {
  return (
    <PopoverOverlay className={styles({ className })}>
      <AriaDialog className="outline bg-gray-100 rounded-[1rem] outline-0 overflow-auto relative">
        {children}
      </AriaDialog>
    </PopoverOverlay>
  );
}
