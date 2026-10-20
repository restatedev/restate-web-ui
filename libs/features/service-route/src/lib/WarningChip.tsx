import { Button } from '@restate/ui-button';
import { DropdownSection } from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { tv } from '@restate/util-styles';
import type { ReactNode } from 'react';

const styles = tv({
  slots: {
    trigger:
      'flex h-5 shrink-0 items-center gap-1 rounded-md border-warning/80 bg-warning-subtle px-1.5 py-0.5 text-2xs font-medium text-warning-strong shadow-none hover:bg-warning-muted/70 pressed:bg-warning-muted',
    icon: 'h-3 w-3 shrink-0 text-warning',
    chevron: 'h-3 w-3 shrink-0 text-warning-subtle',
    message:
      '-m-px flex gap-2 border border-warning bg-warning-subtle p-3 text-0.5xs text-warning-strong first:rounded-t-xl last:rounded-b-xl',
    messageIcon: 'h-4 w-4 shrink-0 text-warning-subtle',
  },
});

export function WarningChip({
  label,
  title,
  messages,
  className,
}: {
  label: ReactNode;
  title: string;
  messages: ReactNode[];
  className?: string;
}) {
  const s = styles();
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="secondary" className={s.trigger({ className })}>
          <Icon name={IconName.TriangleAlert} className={s.icon()} />
          <span className="truncate">{label}</span>
          <Icon name={IconName.ChevronsUpDown} className={s.chevron()} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md">
        <DropdownSection title={title}>
          {messages.map((message, index) => (
            <p key={index} className={s.message()}>
              <Icon name={IconName.TriangleAlert} className={s.messageIcon()} />
              <span>{message}</span>
            </p>
          ))}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
