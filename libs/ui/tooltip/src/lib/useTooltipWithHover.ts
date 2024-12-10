import { RefObject, useEffect } from 'react';

export function useTooltipWithHover({
  shouldDisplayTooltip,
  open,
  close,
  triggerRef,
  contentRef,
  delay = 250,
}: {
  shouldDisplayTooltip?: VoidFunction;
  open: VoidFunction;
  close: VoidFunction;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  delay?: number;
}) {
  useEffect(() => {
    const elementTriggeringHover = triggerRef?.current;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const enterHandler = () => {
      const shouldDisplay = shouldDisplayTooltip
        ? shouldDisplayTooltip()
        : true;
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (shouldDisplay) {
          open();
        }
      }, delay);
    };

    const leaveHandler = (e: MouseEvent) => {
      const hoveredElement = e.relatedTarget as HTMLElement;
      const isHoverElementTooltip = hoveredElement?.role === 'tooltip';
      contentRef.current?.addEventListener(
        'mouseenter',
        () => {
          timeout && clearTimeout(timeout);
        },
        { once: true }
      );
      if (!isHoverElementTooltip) {
        timeout && clearTimeout(timeout);
        timeout = setTimeout(() => {
          close();
        }, delay);
      }
    };
    elementTriggeringHover?.addEventListener('mouseenter', enterHandler);
    elementTriggeringHover?.addEventListener('mouseleave', leaveHandler);

    return () => {
      timeout && clearTimeout(timeout);
      elementTriggeringHover?.removeEventListener('mouseenter', enterHandler);
      elementTriggeringHover?.removeEventListener('mouseleave', leaveHandler);
    };
  }, [close, contentRef, delay, open, shouldDisplayTooltip, triggerRef]);
}
