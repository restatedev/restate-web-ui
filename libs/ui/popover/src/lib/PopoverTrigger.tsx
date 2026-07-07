import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  ContextValue,
  PopoverContext,
  PopoverProps,
} from 'react-aria-components';
import { usePopover } from './usePopover';

export function PopoverTrigger({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  return children;
}

export function getTriggerElement(
  context: ContextValue<PopoverProps, HTMLElement>,
) {
  if (
    context &&
    'triggerRef' in context &&
    'current' in (context?.triggerRef ?? {}) &&
    context.triggerRef?.current instanceof HTMLElement
  ) {
    return context.triggerRef.current;
  }
  return undefined;
}

function isPointInPolygon(
  x: number,
  y: number,
  polygon: Array<[number, number]>,
): boolean {
  let inside = false;

  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [x1, y1] = polygon[previous]!;
    const [x2, y2] = polygon[current]!;

    const isBetweenY = y1 > y !== y2 > y; // Is the point between the vertical range of this edge?

    if (isBetweenY) {
      // Calculate where the edge crosses the horizontal line at y
      const xIntersect = ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;

      if (x < xIntersect) {
        inside = !inside; // Flip the inside state (crossing the edge)
      }
    }
  }

  return inside;
}

function getPolygon(
  triggerEl: HTMLElement,
  popoverEl: HTMLElement,
): [number, number][] {
  const triggerRect = triggerEl.getBoundingClientRect();
  const popoverRect = popoverEl.getBoundingClientRect();
  const placement = popoverEl.dataset['placement']?.split('-').at(0);
  const buffer = 10; // Increased from 5 to 10 for more forgiveness

  switch (placement) {
    case 'bottom': {
      // Create a trapezoid that covers the full width of both elements
      const rightEdge = Math.max(triggerRect.right, popoverRect.right) + buffer;
      const leftEdge = Math.min(triggerRect.left, popoverRect.left) - buffer;

      return [
        // Trigger top edge (full width)
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],

        // Expand to cover right side down to popover
        [rightEdge, triggerRect.bottom + buffer],
        [rightEdge, popoverRect.top - buffer],

        // Popover right and bottom edges
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.top - buffer],

        // Expand to cover left side back to trigger
        [leftEdge, popoverRect.top - buffer],
        [leftEdge, triggerRect.bottom + buffer],
      ];
    }

    case 'top': {
      const rightEdgeTop =
        Math.max(triggerRect.right, popoverRect.right) + buffer;
      const leftEdgeTop = Math.min(triggerRect.left, popoverRect.left) - buffer;

      return [
        // Popover top and sides
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],

        // Expand to cover the gap
        [leftEdgeTop, popoverRect.bottom + buffer],
        [leftEdgeTop, triggerRect.top - buffer],
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [rightEdgeTop, triggerRect.top - buffer],
        [rightEdgeTop, popoverRect.bottom + buffer],
      ];
    }

    case 'left': {
      const topEdge = Math.min(triggerRect.top, popoverRect.top) - buffer;
      const bottomEdge =
        Math.max(triggerRect.bottom, popoverRect.bottom) + buffer;

      return [
        // Popover left side
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],

        // Expand to cover gap
        [popoverRect.right + buffer, bottomEdge],
        [triggerRect.left - buffer, bottomEdge],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.left - buffer, topEdge],
        [popoverRect.right + buffer, topEdge],
      ];
    }

    case 'right': {
      const topEdgeRight = Math.min(triggerRect.top, popoverRect.top) - buffer;
      const bottomEdgeRight =
        Math.max(triggerRect.bottom, popoverRect.bottom) + buffer;

      return [
        // Trigger
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],

        // Expand to cover gap
        [triggerRect.right + buffer, bottomEdgeRight],
        [popoverRect.left - buffer, bottomEdgeRight],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [popoverRect.left - buffer, topEdgeRight],
        [triggerRect.right + buffer, topEdgeRight],
      ];
    }
    default:
      return [];
  }
}
const HOVER_OPEN_DELAY = 250;

// Mirrors react-aria's global tooltip manager (which Popover lacks): at most
// one hover popover is open at a time, and while one is open, hovering another
// trigger hands off immediately instead of waiting for the warmup delay.
//
// TODO: nested popovers don't survive inside a hover popover's content.
// Two independent causes:
//   1. A nested PopoverHoverTrigger takes the instant-handoff path and closes
//      the parent via this singleton — unmounting itself with it.
//   2. Regardless of the singleton, the "other trigger" rule in
//      isPointInSafeArea treats any [aria-expanded] element inside the open
//      card (e.g. the LastError click-popover badge in the invocation hover
//      card) as unsafe, so the parent closes ~50ms after the pointer rests on
//      it.
// Fix (Radix HoverCard / menu-tree style): replace this single slot with a
// module-level stack of open hover popovers ({ close, triggerEl, popoverEl }).
//   - On open(B): pop-and-close entries from the top while B's trigger is NOT
//     DOM-contained in that entry's popover element (sibling handoff stays as
//     is), stop at the first ancestor, then push B on top.
//   - Remove entries by identity on close/unmount, not just from the top.
//   - In isPointInSafeArea: exempt triggers contained in the popover's own
//     popover element from the "other trigger" rule (fixes cause 2), and treat
//     the popover area of any stack entry above yours (your descendants) as
//     safe so ancestors stay open while the pointer is in a nested card.
let closeActiveHoverPopover: (() => void) | null = null;

export function PopoverHoverTrigger({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const popoverContext = useContext(PopoverContext);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTriggerEl = useCallback(
    () => getTriggerElement(popoverContext),
    [popoverContext],
  );

  const { isOpen, setIsOpen } = usePopover();

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearOpenTimeout = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(
    (timeout = 50) => {
      clearCloseTimeout();
      timeoutRef.current = setTimeout(() => {
        setIsOpen?.(false);
      }, timeout);
    },
    [clearCloseTimeout, setIsOpen],
  );

  const close = useCallback(() => {
    setIsOpen?.(false);
  }, [setIsOpen]);

  const open = useCallback(() => {
    clearOpenTimeout();
    clearCloseTimeout();
    if (closeActiveHoverPopover && closeActiveHoverPopover !== close) {
      closeActiveHoverPopover();
    }
    setIsOpen?.(true);
  }, [clearOpenTimeout, clearCloseTimeout, close, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      closeActiveHoverPopover = close;
      return () => {
        if (closeActiveHoverPopover === close) {
          closeActiveHoverPopover = null;
        }
      };
    }
    return undefined;
  }, [isOpen, close]);

  const isPointInSafeArea = useCallback(
    (x: number, y: number) => {
      const triggerEl = getTriggerEl();
      const popoverEl =
        typeof document !== 'undefined' &&
        document.querySelector(
          `[data-trigger][aria-labelledby="${triggerEl?.id}"]`,
        );
      if (
        !(triggerEl instanceof HTMLElement && popoverEl instanceof HTMLElement)
      ) {
        return false;
      }

      // Check if mouse is inside the polygon
      if (!isPointInPolygon(x, y, getPolygon(triggerEl, popoverEl))) {
        return false;
      }

      // Additional check: ensure we're not hovering over another trigger element
      // Find all elements with aria-haspopup (popover triggers)
      const allTriggers = Array.from(
        document.querySelectorAll('[aria-expanded]'),
      );
      for (const trigger of allTriggers) {
        // Skip our own trigger
        if (trigger === triggerEl) continue;

        // Check if mouse is within this trigger's bounding box
        if (trigger instanceof HTMLElement) {
          const rect = trigger.getBoundingClientRect();
          if (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
          ) {
            return false; // Mouse is over a different trigger, not safe
          }
        }
      }

      return true;
    },
    [getTriggerEl],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isOpen) return;

      const { clientX, clientY } = event;

      if (isPointInSafeArea(clientX, clientY)) {
        clearCloseTimeout();
      } else {
        scheduleClose();
      }
    },
    [isOpen, clearCloseTimeout, scheduleClose, isPointInSafeArea],
  );

  const handleTriggerMouseEnter = useCallback(() => {
    clearCloseTimeout();
    if (isOpen) {
      return;
    }
    if (closeActiveHoverPopover) {
      open();
    } else {
      clearOpenTimeout();
      openTimeoutRef.current = setTimeout(open, HOVER_OPEN_DELAY);
    }
  }, [clearCloseTimeout, clearOpenTimeout, isOpen, open]);

  const handleTriggerMouseLeave = useCallback(() => {
    clearOpenTimeout();
  }, [clearOpenTimeout]);

  useEffect(() => {
    const triggerEl = getTriggerEl();
    triggerEl?.addEventListener('mouseenter', handleTriggerMouseEnter);
    triggerEl?.addEventListener('mouseleave', handleTriggerMouseLeave);

    return () => {
      triggerEl?.removeEventListener('mouseenter', handleTriggerMouseEnter);
      triggerEl?.removeEventListener('mouseleave', handleTriggerMouseLeave);
    };
  });

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        clearCloseTimeout();
      };
    }

    return undefined;
  }, [clearCloseTimeout, handleMouseMove, isOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
      clearOpenTimeout();
    };
  }, [clearCloseTimeout, clearOpenTimeout]);

  return children;
}
