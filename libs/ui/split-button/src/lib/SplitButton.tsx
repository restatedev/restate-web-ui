import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { tv } from '@restate/util/styles';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';

const menuTriggerStyles = tv({
  base: 'trigger rounded-l-md rounded-r-md px-1 py-1 [font-size:inherit] [line-height:inherit] group-focus-within:z-2',
  variants: {
    mini: {
      false: 'rounded-l-none',
      true: '',
    },
    variant: {
      primary: 'text-white/90',
      secondary: 'text-gray-600',
      icon: 'text-gray-600',
      destructive: 'text-white/90',
    },
  },
});

const styles = tv({
  base: 'group relative flex items-stretch overflow-visible text-xs',
  slots: {
    primary: '',
  },
  variants: {
    mini: {
      true: {
        base: '[&:has(.trigger[data-pressed=true])>.primary]:hidden [&:hover:has(.trigger:not([data-pressed=true]))_.trigger]:rounded-l-none',
        primary: 'primary contents',
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
  variant = 'secondary',
  splitClassName,
}: PropsWithChildren<{
  mini?: boolean;
  className?: string;
  menus: ReactNode;
  onSelect?: (key: string) => void;
  variant?: ComponentProps<typeof Button>['variant'];
  splitClassName?: string;
}>) {
  const { base, primary } = styles({ mini });
  return (
    <div className={base({ className })}>
      <div className={primary()}>{children}</div>
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant={variant}
            className={menuTriggerStyles({ mini, className: splitClassName })}
          >
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
