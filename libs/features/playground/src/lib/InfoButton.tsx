import type { ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { tv } from '@restate/util-styles';

const titleStyles = tv({
  base: 'text-0.5xs font-semibold text-primary',
  variants: { isCode: { true: 'font-mono' } },
});

export function InfoButton({
  label,
  isCode = false,
  children,
}: {
  label: string;
  isCode?: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="icon"
          aria-label={`About ${label}`}
          className="rounded-full p-0.5 text-subtle hover:text-secondary"
        >
          <Icon name={IconName.Info} className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent placement="top">
        <div className="flex max-w-xs flex-col gap-1 rounded-xl border bg-surface p-3 text-xs font-normal">
          <div className={titleStyles({ isCode })}>{label}</div>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
