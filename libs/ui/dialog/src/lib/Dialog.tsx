import { useSearchParams } from '@remix-run/react';
import { PropsWithChildren, useState } from 'react';
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

export function QueryDialog({
  children,
  query,
}: PropsWithChildren<{ query: string }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = Boolean(searchParams.has(query));
  const [hasBeenClosed, setHasBeenClosed] = useState(false);

  return (
    <DialogTrigger
      isOpen={isOpen && !hasBeenClosed}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setHasBeenClosed(true);
          setTimeout(() => {
            setHasBeenClosed(false);
            setSearchParams(
              (perv) => {
                perv.delete(query);
                return perv;
              },
              { preventScrollReset: true }
            );
          }, 500);
        }
      }}
    >
      {children}
    </DialogTrigger>
  );
}
