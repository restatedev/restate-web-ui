import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DropdownProps {}

export function Dropdown({ children }: PropsWithChildren<DropdownProps>) {
  return <MenuTrigger>{children}</MenuTrigger>;
}
