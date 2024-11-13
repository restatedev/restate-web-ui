import { useSearchParams } from '@remix-run/react';
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

export function QueryDialog({
  children,
  query,
}: PropsWithChildren<{ query: string }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = Boolean(searchParams.has(query));

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSearchParams(
            (perv) => {
              perv.delete(query);
              return perv;
            },
            { preventScrollReset: true }
          );
        }
      }}
    >
      {children}
    </DialogTrigger>
  );
}
