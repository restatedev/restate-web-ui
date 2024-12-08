import { useHover } from '@react-aria/interactions';
import {
  forwardRef,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { Copy } from '@restate/ui/copy';

const TooltipTrigger = forwardRef<
  HTMLElement,
  PropsWithChildren<{ disabled?: boolean }>
>(({ children, disabled = false }, ref) => {
  const state = useContext(TooltipTriggerStateContext);
  const { hoverProps } = useHover({
    isDisabled: disabled,
    onHoverChange(isHovering) {
      isHovering ? state?.open(false) : state?.close();
    },
  });

  return (
    <span ref={ref} {...hoverProps}>
      {children}
    </span>
  );
});

export function TruncateWithTooltip({
  children,
  copyText: copyTextProp,
  triggerRef: additionalTriggerRef,
}: PropsWithChildren<{
  copyText?: string;
  triggerRef?: RefObject<HTMLElement | null>;
}>) {
  const triggerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const [tooltipIsDisabled, setTooltipIsDisabled] = useState(false);
  const [copyText, setCopyText] = useState(copyTextProp ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    let isCanceled = false;
    const calculateShouldDisplayTooltip = () => {
      const containerWidth =
        containerRef.current?.getBoundingClientRect().width ?? 0;
      const textWidth = triggerRef.current?.getBoundingClientRect().width ?? 0;
      return containerWidth < textWidth;
    };

    const containerElement = containerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      if (!isCanceled) {
        setTooltipIsDisabled(!calculateShouldDisplayTooltip());
        !copyTextProp && setCopyText(triggerRef.current?.textContent ?? '');
      }
    });
    containerElement && resizeObserver.observe(containerElement);

    return () => {
      isCanceled = true;
      containerElement && resizeObserver.unobserve(containerElement);
    };
  }, [copyTextProp]);

  useEffect(() => {
    const el = additionalTriggerRef?.current;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const enterHandler = () => {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!tooltipIsDisabled) {
          open();
        }
      }, 250);
    };
    const leaveHandler = (e: MouseEvent) => {
      const hoveredElement = e.relatedTarget as HTMLElement;
      const isHoverElementTooltip = hoveredElement?.role === 'tooltip';
      if (!isHoverElementTooltip) {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(() => {
          close();
        }, 250);
      }
    };
    el?.addEventListener('mouseenter', enterHandler);
    el?.addEventListener('mouseleave', leaveHandler);

    return () => {
      timeout && clearTimeout(timeout);
      el?.removeEventListener('mouseenter', enterHandler);
      el?.removeEventListener('mouseleave', leaveHandler);
    };
  }, [additionalTriggerRef, close, open, tooltipIsDisabled]);

  return (
    <Tooltip disabled={tooltipIsDisabled} delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span className="block truncate max-w-full" ref={containerRef}>
          <TooltipTrigger disabled={tooltipIsDisabled} ref={triggerRef}>
            {children}
          </TooltipTrigger>
        </span>
        <TooltipContent small offset={5} triggerRef={containerRef}>
          <div className="flex items-start gap-4 [&_*]:text-gray-200 [&_*]:text-xs break-all">
            {children}
            <Copy
              copyText={copyText}
              className="p-1 -m-1 -mt-0.5 [&_svg]:w-3 [&_svg]:h-3  [&_svg]:text-gray-200 bg-transparent hover:bg-zinc-600 pressed:bg-zinc-500 rounded-sm"
            />
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
