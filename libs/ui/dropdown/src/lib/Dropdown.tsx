import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

type DropdownProps = unknown;

export function Dropdown({ children }: PropsWithChildren<DropdownProps>) {
  return <MenuTrigger>{children}</MenuTrigger>;
}
