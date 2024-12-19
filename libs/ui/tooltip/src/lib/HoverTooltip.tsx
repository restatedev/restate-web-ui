import {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { useTooltipWithHover } from './useTooltipWithHover';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'block',
});
export function HoverTooltip({
  children,
  content,
  className,
}: PropsWithChildren<{
  content: ReactNode;
  className?: string;
}>) {
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useTooltipWithHover({
    open,
    close,
    triggerRef,
    contentRef,
  });

  return (
    <Tooltip delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span ref={triggerRef} className={styles({ className })}>
          {children}
        </span>
        <TooltipContent small offset={5} triggerRef={triggerRef}>
          <div
            ref={contentRef}
            className="flex items-start gap-4 [&_*]:text-gray-200 [&_*]:text-xs break-all py-1"
          >
            <div className="flex flex-col gap-1 items-start">{content}</div>
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}