import type { ReactNode } from 'react';
import { DialogTrigger } from 'react-aria-components';

export function Popover(props: {
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  return <DialogTrigger {...props} />;
}
