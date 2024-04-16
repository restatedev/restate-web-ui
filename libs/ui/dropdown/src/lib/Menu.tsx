import { Popover } from '@restate/ui/popover';
import { PropsWithChildren, ReactNode } from 'react';
import { MenuTrigger } from 'react-aria-components';

interface MenuProps {
  trigger: ReactNode;
}

export function Menu({ children, trigger }: PropsWithChildren<MenuProps>) {
  return (
    <MenuTrigger>
      {trigger}
      <Popover className="min-w-[150px]">{children}</Popover>
    </MenuTrigger>
  );
}
