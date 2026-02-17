import {
  MouseEvent,
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
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'relative block',
});
export function HoverTooltip({
  children,
  content,
  className,
  offset = 5,
  crossOffset,
  size = 'sm',
  followCursor = false,
}: PropsWithChildren<{
  content: ReactNode;
  className?: string;
  offset?: number;
  crossOffset?: number;
  size?: 'sm' | 'default' | 'lg';
  followCursor?: boolean;
}>) {
  const triggerRef = useRef<HTMLElement>(null);
  const cursorAnchorRef = useRef<HTMLSpanElement>(null);
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

  const updateCursorAnchor = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (!followCursor) {
        return;
      }
      const trigger = triggerRef.current;
      const anchor = cursorAnchorRef.current;
      if (!trigger || !anchor) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      anchor.style.left = `${e.clientX - rect.left}px`;
      anchor.style.top = `${e.clientY - rect.top}px`;
    },
    [followCursor],
  );

  const tooltipTriggerRef = followCursor ? cursorAnchorRef : triggerRef;

  return (
    <Tooltip delay={250}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span
          ref={triggerRef}
          className={styles({ className })}
          onMouseMove={updateCursorAnchor}
          onMouseEnter={updateCursorAnchor}
        >
          {children}
          {followCursor && (
            <span
              ref={cursorAnchorRef}
              className="pointer-events-none absolute h-px w-px opacity-0"
              style={{ left: 0, top: 0 }}
            />
          )}
        </span>
        <TooltipContent
          size={size}
          offset={offset}
          crossOffset={crossOffset}
          triggerRef={tooltipTriggerRef}
        >
          <div
            ref={contentRef}
            className="flex items-start gap-4 py-0 break-all **:text-xs **:text-gray-200"
          >
            <div className="flex flex-col items-start gap-1">{content}</div>
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
