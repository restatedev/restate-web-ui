import { useSearchParams } from 'react-router';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
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
  const hasParam = searchParams.has(query);
  // `isClosing` drives the exit animation: flip the dialog to closed while the
  // query param (and the content it feeds) stays put, then strip the param once
  // the fade-out has finished.
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isOpen = hasParam && !isClosing;

  // Once the param is gone the dialog is fully closed (this also covers the
  // param being removed elsewhere, e.g. a mutation navigating away), so clear
  // the latch to allow re-opening.
  useEffect(() => {
    if (!hasParam) {
      setIsClosing(false);
    }
  }, [hasParam]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open || isClosing) {
          return;
        }
        // Start the exit animation now, but keep the query param in place until
        // the modal has faded out — removing it immediately re-renders the
        // dialog mid-animation (e.g. the selected value resets) and looks janky.
        setIsClosing(true);
        timerRef.current = setTimeout(() => {
          onClose?.();
          setSearchParams(
            (prev) => {
              let next = onCloseQueryParam(new URLSearchParams(prev));
              if (next.getAll(query).length <= 1) {
                next.delete(query);
              } else {
                const value = next.get(query);
                next = new URLSearchParams(
                  next.toString().replace(`${query}=${value}`, ''),
                );
              }
              return next;
            },
            { preventScrollReset: true },
          );
        }, 250);
      }}
    >
      <Button
        className="hidden"
        {...{ [`data-${query.toLowerCase()}-dialog`]: String(isOpen) }}
      />
      {children}
    </DialogTrigger>
  );
}
