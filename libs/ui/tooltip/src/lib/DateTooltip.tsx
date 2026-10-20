import { PropsWithChildren, useCallback, useRef, useState } from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { useTooltipTriggerState } from 'react-stately';
import { TooltipContent } from './TooltipContent';
import { Copy } from '@restate/ui-copy';
import { formatDateTime, formatDateToISO } from '@restate/util-intl';
import { useTooltipWithHover } from './useTooltipWithHover';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'mx-[-0.1em] max-w-full truncate rounded-xs px-[0.1em] underline decoration-faint decoration-dashed decoration-from-font underline-offset-[0.2em] hover:bg-tint hover:decoration-subtle',
});
export function DateTooltip({
  date,
  children,
  title,
  className,
}: PropsWithChildren<{
  date: Date;
  title: string;
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

  const tooltipState = useTooltipTriggerState({
    isOpen,
    onOpenChange: setIsOpen,
    closeDelay: 0,
  });

  return (
    <TooltipTriggerStateContext.Provider value={tooltipState}>
      <span ref={triggerRef} className={styles({ className })}>
        {children}
      </span>
      <TooltipContent size="sm" offset={5} triggerRef={triggerRef}>
        <div
          ref={contentRef}
          className="flex items-start gap-4 py-1 break-all **:text-xs **:text-inverse-secondary"
        >
          <div className="flex flex-col items-start gap-1">
            <h6 className="mb-2 text-sm font-semibold text-inverse">{title}</h6>
            <div className="rounded-sm bg-inverse-muted px-1 font-mono">
              {formatDateTime(date, 'system')}
            </div>
            <div className="rounded-sm bg-inverse-muted px-1 font-mono">
              {formatDateTime(date, 'UTC')}
            </div>
          </div>
          <Copy
            copyText={formatDateToISO(date)}
            className="-m-1 -mt-0.5 rounded-xs bg-transparent p-1 hover:bg-inverse-emphasis pressed:bg-inverse-strong [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-inverse-secondary"
          />
        </div>
      </TooltipContent>
    </TooltipTriggerStateContext.Provider>
  );
}
