import { useHover } from '@react-aria/interactions';
import {
  forwardRef,
  PropsWithChildren,
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
    onHoverChange(isHovering) {
      if (!disabled) {
        isHovering ? state.open(false) : state.close();
      }
    },
  });

  return (
    <span ref={ref} {...hoverProps}>
      {children}
    </span>
  );
});

export function TruncateWithTooltip({ children }: PropsWithChildren<unknown>) {
  const triggerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const [tooltipIsDisabled, setTooltipIsDisabled] = useState(false);
  const [copyText, setCopyText] = useState('');
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
        setCopyText(triggerRef.current?.textContent ?? '');
      }
    });
    containerElement && resizeObserver.observe(containerElement);

    return () => {
      isCanceled = true;
      containerElement && resizeObserver.unobserve(containerElement);
    };
  }, []);

  return (
    <Tooltip disabled={tooltipIsDisabled} delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span className="block truncate" ref={containerRef}>
          <TooltipTrigger disabled={tooltipIsDisabled} ref={triggerRef}>
            {children}
          </TooltipTrigger>
        </span>
        <TooltipContent small offset={0} triggerRef={containerRef}>
          <div className="flex items-center gap-4">
            {children}
            <Copy
              copyText={copyText}
              className="p-1 -m-1 [&_svg]:w-3 [&_svg]:h-3 [&_svg]:text-gray-200 bg-transparent hover:bg-zinc-600 pressed:bg-zinc-500 rounded-sm"
            />
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
