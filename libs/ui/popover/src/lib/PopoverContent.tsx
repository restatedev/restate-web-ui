import { PropsWithChildren, RefObject, useEffect, useRef } from 'react';
import {
  Dialog as AriaDialog,
  DialogContext,
  useSlottedContext,
} from 'react-aria-components';
import { PopoverOverlay } from './PopoverOverlay';
import type { PopoverAnimation, PopoverSlideFrom } from './PopoverOverlay';
import { tv } from '@restate/util-styles';
import { Placement } from 'react-aria';

const styles = tv({
  base: 'rounded-2xl',
});

const dialogStyles = tv({
  base: 'relative overflow-auto rounded-2xl bg-overlay outline-hidden',
});

function ManualFocusDialog({
  shouldFocus,
  children,
}: PropsWithChildren<{ shouldFocus: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  const dialogProps = useSlottedContext(DialogContext);

  useEffect(() => {
    const element = ref.current;
    if (shouldFocus && element && !element.contains(document.activeElement)) {
      element.focus();
    }
  }, [shouldFocus]);

  return (
    <div
      ref={ref}
      role="dialog"
      tabIndex={-1}
      aria-labelledby={dialogProps?.['aria-labelledby']}
      className={dialogStyles()}
    >
      {children}
    </div>
  );
}

export function PopoverContent({
  children,
  className,
  autoFocus,
  ...props
}: PropsWithChildren<{
  className?: string;
  triggerRef?: RefObject<Element | null>;
  placement?: Placement;
  isNonModal?: boolean;
  autoFocus?: boolean;
  animation?: PopoverAnimation;
  slideFrom?: PopoverSlideFrom;
}>) {
  return (
    <PopoverOverlay {...props} className={styles({ className })}>
      {autoFocus === undefined ? (
        <AriaDialog className={dialogStyles()}>{children}</AriaDialog>
      ) : (
        <ManualFocusDialog shouldFocus={autoFocus}>
          {children}
        </ManualFocusDialog>
      )}
    </PopoverOverlay>
  );
}
