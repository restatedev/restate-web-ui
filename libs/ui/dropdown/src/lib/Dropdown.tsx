import { PropsWithChildren } from 'react';
import { MenuTrigger } from 'react-aria-components';

interface DropdownProps {
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen?: boolean;
}

export function Dropdown({
  children,
  defaultOpen,
  onOpenChange,
  isOpen,
}: PropsWithChildren<DropdownProps>) {
  return (
    <MenuTrigger
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      isOpen={isOpen}
    >
      {children}
    </MenuTrigger>
  );
}
