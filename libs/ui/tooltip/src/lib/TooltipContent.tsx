import { ComponentProps, PropsWithChildren } from 'react';
import {
  Tooltip as AriaTooltip,
  composeRenderProps,
  OverlayArrow,
  Tooltip,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface TooltipContentProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  wrap?: boolean;
  offset?: number;
  crossOffset?: number;
  triggerRef?: ComponentProps<typeof AriaTooltip>['triggerRef'];
}

const styles = tv({
  base: 'max-w-sm group border border-zinc-900/80 text-gray-300 drop-shadow-xl will-change-transform ',
  variants: {
    isEntering: {
      true: 'animate-in fade-in placement-bottom:slide-in-from-top-0.5 placement-top:slide-in-from-bottom-0.5 placement-left:slide-in-from-right-0.5 placement-right:slide-in-from-left-0.5 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out fade-out placement-bottom:slide-out-to-top-0.5 placement-top:slide-out-to-bottom-0.5 placement-left:slide-out-to-right-0.5 placement-right:slide-out-to-left-0.5 ease-in duration-150',
    },
    size: {
      sm: 'text-xs px-2 py-1 rounded-md shadow-[inset_0_0.5px_0_0_theme(colors.gray.500)] bg-zinc-800 [&_.content]:break-all [&_.content]:max-w-full',
      lg: 'max-w-2xl px-3 py-2 overflow-auto text-sm rounded-xl shadow-[inset_0_1px_0_0_theme(colors.gray.500)] bg-zinc-800/90 backdrop-blur-xl whitespace-pre',
      default:
        'text-sm p-4 rounded-xl shadow-[inset_0_1px_0_0_theme(colors.gray.500)] bg-zinc-800/90 backdrop-blur-xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const contentStyles = tv({
  base: 'content w-fit flex items-center h-full',
});

export function InternalTooltipContent({
  children,
  size,
  offset = 10,
  crossOffset,
  ...props
}: PropsWithChildren<
  ComponentProps<typeof Tooltip> & Pick<TooltipContentProps, 'size'>
>) {
  return (
    <AriaTooltip
      {...props}
      offset={offset}
      crossOffset={crossOffset}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className, size })
      )}
    >
      {size === 'sm' && (
        <OverlayArrow>
          <svg
            width={8}
            height={8}
            viewBox="0 0 8 8"
            className="fill-zinc-800 stroke-zinc-900/80 group-placement-bottom:rotate-180 group-placement-left:-rotate-90 group-placement-right:rotate-90"
          >
            <path d="M0 0 L4 4 L8 0" />
          </svg>
        </OverlayArrow>
      )}
      <div className={contentStyles()}>{children}</div>
    </AriaTooltip>
  );
}

export function TooltipContent(props: PropsWithChildren<TooltipContentProps>) {
  return <InternalTooltipContent {...props} />;
}
