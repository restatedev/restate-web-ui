import { PropsWithChildren, RefObject } from 'react';
import { Placement } from 'react-aria';
import {
  Popover as AriaPopover,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'max-w-[90%] overflow-auto rounded-xl border border-black/10 bg-gray-100/80 bg-clip-padding text-slate-700 shadow-lg backdrop-blur-xl backdrop-saturate-200',
  variants: {
    isEntering: {
      true: 'duration-200 ease-out animate-in fade-in placement-left:slide-in-from-right-1 placement-right:slide-in-from-left-1 placement-top:slide-in-from-bottom-1 placement-bottom:slide-in-from-top-1',
    },
    isExiting: {
      true: 'duration-150 ease-in animate-out fade-out placement-left:slide-out-to-right-1 placement-right:slide-out-to-left-1 placement-top:slide-out-to-bottom-1 placement-bottom:slide-out-to-top-1',
    },
  },
});

export function PopoverOverlay({
  children,
  className,
  ...props
}: PropsWithChildren<{
  className?: string;
  triggerRef?: RefObject<Element | null>;
  placement?: Placement;
}>) {
  return (
    <AriaPopover
      offset={12}
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({ ...renderProps, className }),
      )}
    >
      {children}
    </AriaPopover>
  );
}
