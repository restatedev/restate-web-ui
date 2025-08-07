import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { tv } from 'tailwind-variants';
import { PropsWithChildren, ReactNode } from 'react';

const menuTriggerStyles = tv({
  base: 'group-focus-within:z-2 trigger rounded-l-md px-1 py-1 [font-size:inherit] [line-height:inherit] rounded-r-md text-gray-600',
  variants: {
    mini: {
      false: 'rounded-l-none',
      true: '',
    },
  },
});

const styles = tv({
  base: 'group flex items-stretch relative overflow-visible group text-xs ',
  slots: {
    primary: '',
  },
  variants: {
    mini: {
      true: {
        base: '[&:has(.trigger[data-pressed=true])>.primary]:hidden [&:hover:has(.trigger:not([data-pressed=true]))_.trigger]:rounded-l-none',
        primary: 'contents primary',
      },
      false: { base: '', primary: 'contents' },
    },
  },
});

export function SplitButton({
  mini = true,
  className,
  children,
  menus,
  onSelect,
}: PropsWithChildren<{
  mini?: boolean;
  className?: string;
  menus: ReactNode;
  onSelect?: (key: string) => void;
}>) {
  const { base, primary } = styles({ mini });
  return (
    <div className={base({ className })}>
      <div className={primary()}>{children}</div>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" className={menuTriggerStyles({ mini })}>
            <Icon name={IconName.ChevronsUpDown} className="h-[1em] w-[1em]" />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownSection title="Actions">
            <DropdownMenu onSelect={onSelect}>{menus}</DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
    </div>
  );
}
