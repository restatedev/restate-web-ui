import { ComponentProps, PropsWithChildren } from 'react';
import {
  Tooltip as AriaTooltip,
  composeRenderProps,
  OverlayArrow,
  Tooltip,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';

interface TooltipContentProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  wrap?: boolean;
  offset?: number;
  crossOffset?: number;
  triggerRef?: ComponentProps<typeof AriaTooltip>['triggerRef'];
}

const styles = tv({
  base: 'group max-w-sm border border-zinc-900/80 text-gray-300 drop-shadow-xl will-change-transform',
  variants: {
    isEntering: {
      true: 'duration-200 ease-out animate-in fade-in placement-left:slide-in-from-right-0.5 placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5',
    },
    isExiting: {
      true: 'duration-150 ease-in animate-out fade-out placement-left:slide-out-to-right-0.5 placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5',
    },
    size: {
      sm: 'rounded-md bg-zinc-800 px-2 py-1 text-xs shadow-[inset_0_0.5px_0_0_var(--color-gray-500)] [&_.content]:max-w-full [&_.content]:break-all',
      lg: 'max-w-2xl overflow-auto rounded-xl bg-zinc-800/90 px-3 py-2 text-sm whitespace-pre shadow-[inset_0_1px_0_0_var(--color-gray-500)] backdrop-blur-xl',
      default:
        'rounded-xl bg-zinc-800/90 p-4 text-sm shadow-[inset_0_1px_0_0_var(--color-gray-500)] backdrop-blur-xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const contentStyles = tv({
  base: 'content flex h-full w-fit items-center',
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
        styles({ ...renderProps, className, size }),
      )}
    >
      {size === 'sm' && (
        <OverlayArrow>
          <svg
            width={8}
            height={8}
            viewBox="0 0 8 8"
            className="fill-zinc-800 stroke-zinc-900/80 group-placement-left:-rotate-90 group-placement-right:rotate-90 group-placement-bottom:rotate-180"
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
