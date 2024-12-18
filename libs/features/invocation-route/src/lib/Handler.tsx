import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { tv } from 'tailwind-variants';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { ReactNode } from 'react';

import { TruncateWithTooltip } from '@restate/ui/tooltip';

const styles = tv({
  base: 'flex flex-row flex-wrap relative items-center  pr-2',
});

export function HandlerCaller({
  className,
  name,
  input,
  output,
}: {
  className?: string;
  name: string;
  input?: ReactNode;
  output?: ReactNode;
}) {
  return (
    <div className={styles({ className })}>
      <div className="text-inherits w-full text-zinc-600 italic font-medium flex-auto">
        <span className="flex items-center min-w-0">
          <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>

          <span className="ml-[0.5ch] shrink-0 text-zinc-400">{'('}</span>
          {input}
          <span className="shrink-0 text-zinc-400">
            {')'}
            {output && <span className="text-zinc-500 mx-[0.5ch]">→</span>}
          </span>
          {output}
        </span>
      </div>
    </div>
  );
}

const inputOutputStyles = tv({
  base: 'contents text-2xs gap-1 rounded-md pl-0.5 py-0  items-center text-zinc-700',
  slots: {
    value: 'contents text-zinc-500 font-semibold font-mono leading-5 mr-0.5',
    content: 'min-w-80 overflow-auto max-w-[min(90vw,600px)] px-4 mb-1',
  },
});

export function InputOutput({
  className,
  name,
  popoverContent,
  popoverTitle,
}: {
  className?: string;
  name: string;
  popoverContent: ReactNode;
  popoverTitle: string;
}) {
  const { base, value, content } = inputOutputStyles();

  return (
    <div className={base()}>
      <span className={value()}>
        <Popover>
          <PopoverHoverTrigger>
            <Button
              className="basis-20 grow max-w-fit truncate font-mono text-inherit [font-style:inherit] [font-size:inherit] px-0.5 py-0 rounded-sm underline-offset-4 decoration-from-font decoration-dashed underline "
              variant="icon"
            >
              <span className="truncate pr-0.5">{name}</span>
            </Button>
          </PopoverHoverTrigger>
          <PopoverContent>
            <DropdownSection
              className={content({ className })}
              title={
                <div className="flex items-center">
                  <span>{popoverTitle}</span>
                </div>
              }
            >
              {popoverContent}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}
