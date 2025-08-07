import { useSearchParams } from 'react-router';
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
            (prev) => {
              if (prev.getAll(query).length <= 1) {
                prev.delete(query);
                return prev;
              } else {
                const value = prev.get(query);
                return new URLSearchParams(
                  prev.toString().replace(`${query}=${value}`, ''),
                );
              }
            },
            { preventScrollReset: true },
          );
        }
      }}
    >
      {children}
    </DialogTrigger>
  );
}
