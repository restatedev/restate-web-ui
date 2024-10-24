import { PropsWithChildren } from 'react';
import {
  Tooltip as AriaTooltip,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface TooltipContentProps {
  className?: string;
}

const styles = tv({
  base: 'group bg-zinc-800/80 backdrop-blur-lg border border-zinc-800 shadow-[inset_0_1px_0_0_theme(colors.gray.600)] text-white text-sm rounded-lg drop-shadow-lg will-change-transform px-3 py-1',
  variants: {
    isEntering: {
      true: 'animate-in fade-in placement-bottom:slide-in-from-top-0.5 placement-top:slide-in-from-bottom-0.5 placement-left:slide-in-from-right-0.5 placement-right:slide-in-from-left-0.5 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out fade-out placement-bottom:slide-out-to-top-0.5 placement-top:slide-out-to-bottom-0.5 placement-left:slide-out-to-right-0.5 placement-right:slide-out-to-left-0.5 ease-in duration-150',
    },
  },
});

export function TooltipContent({
  children,
  ...props
}: PropsWithChildren<TooltipContentProps>) {
  return (
    <AriaTooltip
      {...props}
      offset={10}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className })
      )}
    >
      {children}
    </AriaTooltip>
  );
}