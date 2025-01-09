import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

interface DropdownProps {
  defaultOpen?: boolean;
}

export function Dropdown({
  children,
  defaultOpen,
}: PropsWithChildren<DropdownProps>) {
  return <MenuTrigger defaultOpen={defaultOpen}>{children}</MenuTrigger>;
}
