import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

interface DropdownProps {
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function Dropdown({
  children,
  defaultOpen,
  onOpenChange,
}: PropsWithChildren<DropdownProps>) {
  return (
    <MenuTrigger defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </MenuTrigger>
  );
}
