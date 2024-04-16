import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

interface DropdownProps {}

export function Dropdown({ children }: PropsWithChildren<DropdownProps>) {
  return <MenuTrigger>{children}</MenuTrigger>;
}
