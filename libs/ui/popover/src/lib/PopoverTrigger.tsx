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
  context: ContextValue<PopoverProps, HTMLElement>
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
  polygon: Array<[number, number]>
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
  popoverEl: HTMLElement
): [number, number][] {
  const triggerRect = triggerEl.getBoundingClientRect();
  const popoverRect = popoverEl.getBoundingClientRect();
  const placement = popoverEl.dataset.placement?.split('-').at(0);
  const buffer = 5;
  switch (placement) {
    case 'bottom':
      return [
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],
      ];
    case 'top':
      return [
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
      ];
    case 'left':
      return [
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
      ];
    case 'right':
      return [
        [triggerRect.left - buffer, triggerRect.top - buffer],
        [triggerRect.right + buffer, triggerRect.top - buffer],
        [popoverRect.left - buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.top - buffer],
        [popoverRect.right + buffer, popoverRect.bottom + buffer],
        [popoverRect.left - buffer, popoverRect.bottom + buffer],
        [triggerRect.right + buffer, triggerRect.bottom + buffer],
        [triggerRect.left - buffer, triggerRect.bottom + buffer],
      ];

    default:
      return [];
  }
}
export function PopoverHoverTrigger({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const popoverContext = useContext(PopoverContext);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerEl = getTriggerElement(popoverContext);

  const { isOpen, setIsOpen } = usePopover();

  const clearCloseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    timeoutRef.current = setTimeout(() => {
      setIsOpen?.(false);
    }, 50);
  }, [clearCloseTimeout, setIsOpen]);

  const isPointInSafeArea = useCallback(
    (x: number, y: number) => {
      const popoverEl =
        typeof document !== 'undefined' &&
        document.querySelector(
          `[data-trigger][aria-labelledby="${triggerEl?.id}"]`
        );
      if (
        !(triggerEl instanceof HTMLElement && popoverEl instanceof HTMLElement)
      ) {
        return false;
      }

      return isPointInPolygon(x, y, getPolygon(triggerEl, popoverEl));
    },
    [triggerEl]
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
    [isOpen, clearCloseTimeout, scheduleClose, isPointInSafeArea]
  );

  const handleTriggerMouseEnter = useCallback(() => {
    clearCloseTimeout();
    setIsOpen?.(true);
  }, [clearCloseTimeout, setIsOpen]);

  useEffect(() => {
    triggerEl?.addEventListener('mouseenter', handleTriggerMouseEnter);

    return () => {
      triggerEl?.addEventListener('mouseleave', handleTriggerMouseEnter);
    };
  }, [handleTriggerMouseEnter, triggerEl]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        clearCloseTimeout();
      };
    }
  }, [clearCloseTimeout, handleMouseMove, isOpen]);

  return children;
}
