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
const HOVER_CLOSE_DELAY = 50;

function getPopoverElement(triggerEl: HTMLElement | null | undefined) {
  if (!triggerEl?.id || typeof document === 'undefined') {
    return null;
  }
  return document.querySelector(
    `[data-trigger][aria-labelledby="${triggerEl.id}"]`,
  );
}

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
let isActiveHoverPopoverPinned = false;
let activeHoverPopoverTrigger: HTMLElement | null = null;
let activeHoverPopoverHandoffDelay = 0;

function isPointInRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isPointInNestedPopover(x: number, y: number, popoverEl: HTMLElement) {
  const popovers = document.querySelectorAll('[data-trigger][aria-labelledby]');
  for (const nestedPopoverEl of popovers) {
    const nestedTriggerEl = document.getElementById(
      nestedPopoverEl.getAttribute('aria-labelledby') ?? '',
    );
    if (
      nestedPopoverEl instanceof HTMLElement &&
      nestedTriggerEl &&
      popoverEl.contains(nestedTriggerEl) &&
      (isPointInRect(x, y, nestedPopoverEl.getBoundingClientRect()) ||
        isPointInPolygon(x, y, getPolygon(nestedTriggerEl, nestedPopoverEl)))
    ) {
      return true;
    }
  }
  return false;
}

function isInsideActiveHoverPopover(triggerEl: HTMLElement | undefined) {
  return Boolean(
    triggerEl &&
    getPopoverElement(activeHoverPopoverTrigger)?.contains(triggerEl),
  );
}

export function PopoverHoverTrigger({
  children,
  openDelay = HOVER_OPEN_DELAY,
  closeDelay = HOVER_CLOSE_DELAY,
  handoffDelay = 0,
  isPinned = false,
  isHoverDisabled = false,
}: PropsWithChildren<{
  openDelay?: number;
  closeDelay?: number;
  handoffDelay?: number;
  isPinned?: boolean;
  isHoverDisabled?: boolean;
}>) {
  const popoverContext = useContext(PopoverContext);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isArmedRef = useRef(false);

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

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen?.(false);
    }, closeDelay);
  }, [clearCloseTimeout, closeDelay, setIsOpen]);

  const close = useCallback(() => {
    setIsOpen?.(false);
  }, [setIsOpen]);

  const open = useCallback(() => {
    clearOpenTimeout();
    clearCloseTimeout();
    const isNested = isInsideActiveHoverPopover(getTriggerEl());
    if (
      closeActiveHoverPopover &&
      closeActiveHoverPopover !== close &&
      !isNested
    ) {
      if (isActiveHoverPopoverPinned) {
        return;
      }
      closeActiveHoverPopover();
    }
    setIsOpen?.(true);
  }, [clearOpenTimeout, clearCloseTimeout, close, getTriggerEl, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      clearOpenTimeout();
      if (isPinned) {
        clearCloseTimeout();
      }
      const triggerEl = getTriggerEl();
      if (isInsideActiveHoverPopover(triggerEl)) {
        return undefined;
      }
      closeActiveHoverPopover = close;
      isActiveHoverPopoverPinned = isPinned;
      activeHoverPopoverTrigger = triggerEl ?? null;
      activeHoverPopoverHandoffDelay = handoffDelay;
      return () => {
        if (closeActiveHoverPopover === close) {
          closeActiveHoverPopover = null;
          isActiveHoverPopoverPinned = false;
          activeHoverPopoverTrigger = null;
          activeHoverPopoverHandoffDelay = 0;
        }
      };
    }
    return undefined;
  }, [
    isOpen,
    isPinned,
    close,
    clearOpenTimeout,
    clearCloseTimeout,
    getTriggerEl,
    handoffDelay,
  ]);

  const isPointInSafeArea = useCallback(
    (x: number, y: number) => {
      const triggerEl = getTriggerEl();
      const popoverEl = getPopoverElement(triggerEl);
      if (
        !(triggerEl instanceof HTMLElement && popoverEl instanceof HTMLElement)
      ) {
        return false;
      }

      if (
        isPointInRect(x, y, popoverEl.getBoundingClientRect()) ||
        isPointInNestedPopover(x, y, popoverEl)
      ) {
        return true;
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
        // Skip our own trigger and the triggers inside our own popover
        if (trigger === triggerEl || popoverEl.contains(trigger)) continue;

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
      if (!isOpen || isPinned) return;

      const { clientX, clientY } = event;

      if (isPointInSafeArea(clientX, clientY)) {
        clearCloseTimeout();
      } else {
        scheduleClose();
      }
    },
    [isOpen, isPinned, clearCloseTimeout, scheduleClose, isPointInSafeArea],
  );

  const handleTriggerMouseEnter = useCallback(() => {
    clearCloseTimeout();
    isArmedRef.current = true;
  }, [clearCloseTimeout]);

  const handleTriggerMouseMove = useCallback(() => {
    if (!isArmedRef.current) {
      return;
    }
    isArmedRef.current = false;
    if (isOpen || isHoverDisabled) {
      return;
    }
    const isNested = isInsideActiveHoverPopover(getTriggerEl());
    if (isActiveHoverPopoverPinned && !isNested) {
      return;
    }
    const canHandOff = Boolean(closeActiveHoverPopover);
    const delay = canHandOff
      ? Math.max(handoffDelay, activeHoverPopoverHandoffDelay)
      : openDelay;
    if (canHandOff && (isNested || delay === 0)) {
      open();
    } else {
      clearOpenTimeout();
      openTimeoutRef.current = setTimeout(open, delay);
    }
  }, [
    clearOpenTimeout,
    getTriggerEl,
    handoffDelay,
    isHoverDisabled,
    isOpen,
    open,
    openDelay,
  ]);

  const handleTriggerMouseLeave = useCallback(() => {
    isArmedRef.current = false;
    clearOpenTimeout();
  }, [clearOpenTimeout]);

  useEffect(() => {
    const triggerEl = getTriggerEl();
    triggerEl?.addEventListener('mouseenter', handleTriggerMouseEnter);
    triggerEl?.addEventListener('mousemove', handleTriggerMouseMove);
    triggerEl?.addEventListener('mouseleave', handleTriggerMouseLeave);

    return () => {
      triggerEl?.removeEventListener('mouseenter', handleTriggerMouseEnter);
      triggerEl?.removeEventListener('mousemove', handleTriggerMouseMove);
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
