import {
  ComponentProps,
  forwardRef,
  PropsWithChildren,
  ReactNode,
  RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { Copy } from '@restate/ui/copy';
import { useTooltipWithHover } from './useTooltipWithHover';
import { tv } from '@restate/util/styles';

export const TruncateTooltipTrigger = forwardRef<
  HTMLElement,
  PropsWithChildren<unknown>
>(({ children }, ref) => {
  return (
    <span className="block max-w-full truncate">
      <span data-truncate-tooltip="true" ref={ref}>
        {children}
      </span>
    </span>
  );
});

const contentStyles = tv({
  base: 'self-center',
  variants: {
    size: {
      sm: '',
      lg: 'whitespace-pre',
      default: '',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export function TruncateWithTooltip({
  children,
  copyText: copyTextProp,
  triggerRef: propTriggerRef,
  tooltipContent = children,
  hideCopy,
  size = 'sm',
}: PropsWithChildren<{
  copyText?: string;
  triggerRef?: RefObject<HTMLElement | null>;
  tooltipContent?: ReactNode;
  hideCopy?: boolean;
  size?: ComponentProps<typeof TooltipContent>['size'];
}>) {
  const triggerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const tooltipHoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const shouldDisplayTooltip = useCallback(() => {
    const triggers = containerRef.current?.querySelectorAll(
      '[data-truncate-tooltip=true]',
    );
    if (triggers) {
      return Array.from(triggers).some((el) => {
        const containerWidth =
          el.parentElement?.getBoundingClientRect().width ?? 0;
        const textWidth = el?.getBoundingClientRect().width ?? 0;
        return containerWidth < textWidth;
      });
    }
    return false;
  }, []);

  useTooltipWithHover({
    shouldDisplayTooltip,
    open,
    close,
    triggerRef: propTriggerRef ?? containerRef,
    contentRef: tooltipHoverRef,
  });

  return (
    <Tooltip delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span className="block max-w-full truncate" ref={containerRef}>
          <TruncateTooltipTrigger ref={triggerRef}>
            {children}
          </TruncateTooltipTrigger>
        </span>
        <TooltipContent size={size} offset={5} triggerRef={containerRef}>
          <div
            className="flex items-start gap-4 whitespace-pre-wrap **:text-xs **:text-gray-200"
            ref={tooltipHoverRef}
          >
            <div className={contentStyles({ size })}>{tooltipContent}</div>
            {!hideCopy && (
              <Copy
                copyText={copyTextProp ?? triggerRef.current?.textContent ?? ''}
                className="sticky top-0 right-0 translate-x-1 rounded-xs bg-zinc-800/90 p-1 hover:bg-zinc-600 pressed:bg-zinc-500 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-gray-200"
              />
            )}
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
