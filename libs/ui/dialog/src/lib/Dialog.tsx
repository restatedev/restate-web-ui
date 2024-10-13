import { PropsWithChildren } from 'react';
import { DialogTrigger } from 'react-aria-components';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function Dialog({
  children,
  open,
  onOpenChange,
}: PropsWithChildren<DialogProps>) {
  return (
    <DialogTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </DialogTrigger>
  );
}
