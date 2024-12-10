import { PropsWithChildren, useCallback, useRef, useState } from 'react';
import { TooltipTriggerStateContext } from 'react-aria-components';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { Copy } from '@restate/ui/copy';
import { formatDateTime } from '@restate/util/intl';
import { useTooltipWithHover } from './useTooltipWithHover';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'hover:bg-black/5 decoration-zinc-400 rounded-sm mx-[-0.1em] px-[0.1em] underline-offset-[0.2em] decoration-from-font decoration-dashed underline max-w-full truncate',
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
            <div className="flex flex-col gap-1 items-start">
              <h6 className="text-sm font-semibold text-gray-100 mb-2">
                {title}
              </h6>
              <div className="bg-zinc-700 rounded px-1 font-mono">
                {formatDateTime(date, 'system')}
              </div>
              <div className="bg-zinc-700 rounded px-1 font-mono">
                {formatDateTime(date, 'UTC')}
              </div>
            </div>
            <Copy
              copyText={date.toISOString()}
              className="p-1 -m-1 -mt-0.5 [&_svg]:w-3 [&_svg]:h-3  [&_svg]:text-gray-200 bg-transparent hover:bg-zinc-600 pressed:bg-zinc-500 rounded-sm"
            />
          </div>
        </TooltipContent>
      </TooltipTriggerStateContext.Provider>
    </Tooltip>
  );
}
