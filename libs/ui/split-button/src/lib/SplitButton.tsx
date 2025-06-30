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
  base: 'group-focus-within:z-[2] rounded-l-md px-1 py-1 [font-size:inherit] [line-height:inherit] rounded-r-md text-gray-600',
  variants: {
    mini: {
      false: 'rounded-l-none',
      true: 'group-hover:rounded-l-none',
    },
  },
});

const styles = tv({
  base: 'flex items-stretch relative overflow-visible group text-xs',
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
  return (
    <div className={styles({ className })}>
      {children}
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" className={menuTriggerStyles({ mini })}>
            <Icon name={IconName.ChevronsUpDown} className="w-[1em] h-[1em]" />
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
