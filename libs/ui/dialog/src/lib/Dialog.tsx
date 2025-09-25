import { useSearchParams } from 'react-router';
import { PropsWithChildren, useTransition } from 'react';
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

const noOp = (prev: URLSearchParams) => prev;

export function QueryDialog({
  children,
  query,
  onClose,
  onCloseQueryParam = noOp,
}: PropsWithChildren<{
  query: string;
  onClose?: VoidFunction;
  onCloseQueryParam?: (prev: URLSearchParams) => URLSearchParams;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = Boolean(searchParams.has(query));
  const [isClosing, startClosing] = useTransition();

  return (
    <DialogTrigger
      isOpen={isOpen && !isClosing}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          startClosing(async () => {
            await new Promise((r) =>
              setTimeout(() => {
                r(true);
              }, 250),
            );
            onClose?.();

            setSearchParams(
              (old) => {
                const prev = onCloseQueryParam(old);
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
            await new Promise((r) =>
              setTimeout(() => {
                r(true);
              }, 250),
            );
          });
        }
      }}
    >
      {children}
    </DialogTrigger>
  );
}
