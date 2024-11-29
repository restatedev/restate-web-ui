import {
  forwardRef,
  PropsWithChildren,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { Copy } from '@restate/ui/copy';

export const TruncateTooltipTrigger = forwardRef<
  HTMLElement,
  PropsWithChildren<unknown>
>(({ children }, ref) => {
  return (
    <span className="block truncate max-w-full">
      <span data-truncate-tooltip="true" ref={ref}>
        {children}
      </span>
    </span>
  );
});

export function TruncateWithTooltip({
  children,
  copyText: copyTextProp,
  triggerRef: propTriggerRef,
  tooltipContent = children,
}: PropsWithChildren<{
  copyText?: string;
  triggerRef?: RefObject<HTMLElement | null>;
  tooltipContent?: ReactNode;
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

  useEffect(() => {
    const elementTriggeringHover =
      propTriggerRef?.current ?? containerRef.current;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const calculateShouldDisplayTooltip = () => {
      const triggers = containerRef.current?.querySelectorAll(
        '[data-truncate-tooltip=true]'
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
    };
    const enterHandler = () => {
      const shouldDisplay = calculateShouldDisplayTooltip();
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (shouldDisplay) {
          open();
        }
      }, 250);
    };

    const leaveHandler = (e: MouseEvent) => {
      const hoveredElement = e.relatedTarget as HTMLElement;
      const isHoverElementTooltip = hoveredElement?.role === 'tooltip';
      tooltipHoverRef.current?.addEventListener(
        'mouseenter',
        () => {
          console.log('clean');
          timeout && clearTimeout(timeout);
        },
        { once: true }
      );
      if (!isHoverElementTooltip) {
        console.log('close');
        timeout && clearTimeout(timeout);
        timeout = setTimeout(() => {
          close();
        }, 250);
      }
    };
    elementTriggeringHover?.addEventListener('mouseenter', enterHandler);
    elementTriggeringHover?.addEventListener('mouseleave', leaveHandler);

    return () => {
      timeout && clearTimeout(timeout);
      elementTriggeringHover?.removeEventListener('mouseenter', enterHandler);
      elementTriggeringHover?.removeEventListener('mouseleave', leaveHandler);
    };
  }, [propTriggerRef, close, open]);

  return (
    <Tooltip delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span className="block truncate max-w-full" ref={containerRef}>
          <TruncateTooltipTrigger ref={triggerRef}>
            {children}
          </TruncateTooltipTrigger>
        </span>
        <TooltipContent small offset={5} triggerRef={containerRef}>
          <div
            className="flex items-start gap-4 [&_*]:text-gray-200 [&_*]:text-xs break-all"
            ref={tooltipHoverRef}
          >
            {tooltipContent}
            <Copy
              copyText={copyTextProp ?? triggerRef.current?.textContent ?? ''}
              className="p-1 -m-1 -mt-0.5 [&_svg]:w-3 [&_svg]:h-3  [&_svg]:text-gray-200 bg-transparent hover:bg-zinc-600 pressed:bg-zinc-500 rounded-sm"
            />
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
