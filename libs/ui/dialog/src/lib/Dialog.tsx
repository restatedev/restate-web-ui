import { useSearchParams } from '@remix-run/react';
import { PropsWithChildren, useCallback } from 'react';
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

  const close = useCallback(() => {
    setSearchParams(
      (perv) => {
        perv.delete(query);
        return perv;
      },
      { preventScrollReset: true }
    );
  }, [query, setSearchParams]);

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
    >
      {children}
    </DialogTrigger>
  );
}
