import {
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
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

const SCROLL_SUPPRESS_MS = 700;
const PRESS_SUPPRESS_MS = 700;
let scrollSuppressUntil = 0;
let closeActiveHoverTooltip: (() => void) | null = null;

function markScrollSuppressed() {
  scrollSuppressUntil = Date.now() + SCROLL_SUPPRESS_MS;
}

const contentStyles = tv({
  base: '"flex **:text-gray-200" items-start gap-4 py-0 break-all **:text-xs',
});

export function HoverTooltip({
  children,
  content,
  className,
  offset = 5,
  crossOffset,
  size = 'sm',
  followCursor = false,
  suppressOnScroll = false,
  placement,
  disabled = false,
  contentClassName,
  onOpenChange,
}: PropsWithChildren<{
  content: ReactNode;
  className?: string;
  contentClassName?: string;
  offset?: number;
  crossOffset?: number;
  size?: 'sm' | 'default' | 'lg';
  followCursor?: boolean;
  suppressOnScroll?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}>) {
  const triggerRef = useRef<HTMLElement>(null);
  const cursorAnchorRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPointerOverRef = useRef(false);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const reopenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressSuppressUntilRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const close = useCallback(() => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);
  const open = useCallback(() => {
    if (isOpenRef.current) return;
    if (closeActiveHoverTooltip && closeActiveHoverTooltip !== close) {
      closeActiveHoverTooltip();
    }
    isOpenRef.current = true;
    setIsOpen(true);
    onOpenChange?.(true);
  }, [close, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;
    closeActiveHoverTooltip = close;
    return () => {
      if (closeActiveHoverTooltip === close) {
        closeActiveHoverTooltip = null;
      }
    };
  }, [close, isOpen]);

  const clearReopenTimeout = useCallback(() => {
    if (reopenTimeoutRef.current) {
      clearTimeout(reopenTimeoutRef.current);
      reopenTimeoutRef.current = null;
    }
  }, []);

  const scheduleReopenIfHovered = useCallback(() => {
    clearReopenTimeout();
    reopenTimeoutRef.current = setTimeout(() => {
      reopenTimeoutRef.current = null;
      if (!isPointerOverRef.current || Date.now() < scrollSuppressUntil) {
        return;
      }

      const trigger = triggerRef.current;
      const pointerPos = lastPointerPosRef.current;
      if (!trigger || !pointerPos) {
        return;
      }

      const hoveredElement = document.elementFromPoint(
        pointerPos.x,
        pointerPos.y,
      );
      if (!hoveredElement || !trigger.contains(hoveredElement)) {
        isPointerOverRef.current = false;
        return;
      }

      if (followCursor) {
        const anchor = cursorAnchorRef.current;
        if (!anchor) {
          return;
        }
        const rect = trigger.getBoundingClientRect();
        anchor.style.left = `${pointerPos.x - rect.left}px`;
        anchor.style.top = `${pointerPos.y - rect.top}px`;
      }

      open();
    }, SCROLL_SUPPRESS_MS + 20);
  }, [clearReopenTimeout, followCursor, open]);

  useEffect(() => {
    return () => {
      clearReopenTimeout();
    };
  }, [clearReopenTimeout]);

  const shouldDisplayTooltip = useCallback(() => {
    if (disabled) {
      return false;
    }
    if (Date.now() < pressSuppressUntilRef.current) {
      return false;
    }
    if (!suppressOnScroll) {
      return true;
    }
    return Date.now() >= scrollSuppressUntil;
  }, [disabled, suppressOnScroll]);

  const handleWheelStart = useCallback(() => {
    if (!suppressOnScroll) {
      return;
    }
    markScrollSuppressed();
    close();
    scheduleReopenIfHovered();
  }, [close, scheduleReopenIfHovered, suppressOnScroll]);

  useTooltipWithHover({
    shouldDisplayTooltip,
    open,
    close,
    triggerRef,
    contentRef,
  });

  const updateCursorAnchor = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
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

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      isPointerOverRef.current = true;
      updateCursorAnchor(e);
      if (closeActiveHoverTooltip && closeActiveHoverTooltip !== close) {
        open();
      }
    },
    [close, open, updateCursorAnchor],
  );

  const handleMouseLeave = useCallback(() => {
    isPointerOverRef.current = false;
    clearReopenTimeout();
  }, [clearReopenTimeout]);

  const handlePointerDown = useCallback(() => {
    pressSuppressUntilRef.current = Date.now() + PRESS_SUPPRESS_MS;
    clearReopenTimeout();
    close();
  }, [clearReopenTimeout, close]);

  const tooltipTriggerRef = followCursor ? cursorAnchorRef : triggerRef;

  return (
    <Tooltip delay={250} disabled={disabled}>
      <TooltipTriggerStateContext.Provider value={{ isOpen, open, close }}>
        <span
          ref={triggerRef}
          className={styles({ className })}
          onMouseMove={updateCursorAnchor}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onWheelCapture={handleWheelStart}
          onPointerDown={handlePointerDown}
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
          placement={placement}
          triggerRef={tooltipTriggerRef}
        >
          <div
            ref={contentRef}
            className={contentStyles({ className: contentClassName })}
          >
            <div className="flex flex-col items-start gap-1">{content}</div>
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
