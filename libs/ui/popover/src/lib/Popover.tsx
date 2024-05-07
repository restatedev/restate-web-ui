import { PropsWithChildren } from 'react';
import {
  Popover as AriaPopover,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'overflow-auto bg-gray-50/80 backdrop-blur-xl backdrop-saturate-200 shadow-lg rounded-xl bg-clip-padding border border-black/10 text-slate-700 max-w-[90%]',
  variants: {
    isEntering: {
      true: 'animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1 placement-left:slide-in-from-right-1 placement-right:slide-in-from-left-1 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out fade-out placement-bottom:slide-out-to-top-1 placement-top:slide-out-to-bottom-1 placement-left:slide-out-to-right-1 placement-right:slide-out-to-left-1 ease-in duration-150',
    },
  },
});

export function Popover({
  children,
  className,
  ...props
}: PropsWithChildren<{ className?: string }>) {
  return (
    <AriaPopover
      offset={12}
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({ ...renderProps, className })
      )}
    >
      {children}
    </AriaPopover>
  );
}
