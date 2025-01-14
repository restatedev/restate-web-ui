import { PropsWithChildren, useContext, useEffect } from 'react';
import {
  ContextValue,
  OverlayTriggerStateContext,
  PopoverContext,
  PopoverProps,
} from 'react-aria-components';

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

export function PopoverHoverTrigger({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const popoverContext = useContext(PopoverContext);
  const overLayContext = useContext(OverlayTriggerStateContext);

  useEffect(() => {
    const elementTriggeringHover = getTriggerElement(popoverContext);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isPopoverHovered = false;

    const enterHandler = () => {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        overLayContext?.open();
      }, 250);
    };

    const observer = new MutationObserver((mutations, observer) => {
      const popoverId = (mutations.at(0)?.target as HTMLElement)?.getAttribute(
        'aria-controls'
      );
      if (popoverId) {
        const popoverEl = document.getElementById(popoverId);
        popoverEl?.addEventListener(
          'mouseover',
          () => {
            isPopoverHovered = true;
            timeout && clearTimeout(timeout);
          },
          { once: true }
        );
        popoverEl?.addEventListener(
          'mouseleave',
          () => {
            isPopoverHovered = false;
            timeout = setTimeout(() => {
              overLayContext?.close();
            }, 250);
            observer.disconnect();
          },
          { once: true }
        );
      }
    });

    elementTriggeringHover &&
      observer.observe(elementTriggeringHover, {
        attributeOldValue: true,
        subtree: true,
        attributes: true,
        childList: true,
      });

    const leaveHandler = (e: MouseEvent) => {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        !isPopoverHovered && overLayContext?.close();
      }, 250);
    };

    elementTriggeringHover?.addEventListener('mouseover', enterHandler);
    elementTriggeringHover?.addEventListener('mouseleave', leaveHandler);

    return () => {
      timeout && clearTimeout(timeout);
      elementTriggeringHover?.removeEventListener('mouseover', enterHandler);
      elementTriggeringHover?.removeEventListener('mouseleave', leaveHandler);
      observer.disconnect();
    };
  }, [overLayContext, popoverContext]);

  return children;
}
