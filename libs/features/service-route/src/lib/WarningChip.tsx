import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';

const styles = tv({
  slots: {
    trigger:
      'flex h-5 shrink-0 items-center gap-1 rounded-md border-orange-200/80 bg-orange-50/70 px-1.5 py-0.5 text-2xs font-medium text-orange-700 shadow-none hover:bg-orange-100/70 pressed:bg-orange-100',
    icon: 'h-3 w-3 shrink-0 text-orange-600',
    chevron: 'h-3 w-3 shrink-0 text-orange-400',
    message:
      '-m-px flex gap-2 border border-orange-200 bg-orange-50 p-3 text-0.5xs text-orange-700 first:rounded-t-xl last:rounded-b-xl',
    messageIcon: 'h-4 w-4 shrink-0 text-orange-500',
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
