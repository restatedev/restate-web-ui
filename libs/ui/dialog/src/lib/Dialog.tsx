import { useSearchParams } from 'react-router';
import { PropsWithChildren, useTransition } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { Button } from '@restate/ui/button';

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
              }, 200),
            );

            const current = new URLSearchParams(window.location.search);
            let currentWithUpdate = onCloseQueryParam(current);
            if (currentWithUpdate.getAll(query).length <= 1) {
              currentWithUpdate.delete(query);
            } else {
              const value = currentWithUpdate.get(query);
              currentWithUpdate = new URLSearchParams(
                currentWithUpdate.toString().replace(`${query}=${value}`, ''),
              );
            }

            onClose?.();
            setSearchParams(currentWithUpdate, { preventScrollReset: true });

            await new Promise((r) =>
              setTimeout(() => {
                r(true);
              }, 250),
            );
          });
        }
      }}
    >
      <Button
        className="hidden"
        {...{
          [`data-${query.toLowerCase()}-dialog`]: String(isOpen && !isClosing),
        }}
      />
      {children}
    </DialogTrigger>
  );
}
