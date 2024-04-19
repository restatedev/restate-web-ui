import { PropsWithChildren } from 'react';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const overlayStyles = tv({
  base: 'fixed top-0 left-0 w-full min-h-full isolate z-20 bg-black/[15%] flex items-center justify-center p-4 text-center backdrop-blur-lg',
  variants: {
    isEntering: {
      true: 'animate-in fade-in duration-200 ease-out',
    },
    isExiting: {
      true: 'animate-out fade-out duration-200 ease-in',
    },
  },
});

const modalStyles = tv({
  base: 'w-full max-w-md max-h-full rounded-2xl bg-white dark:bg-zinc-800/70 dark:backdrop-blur-2xl dark:backdrop-saturate-200 forced-colors:bg-[Canvas] text-left align-middle text-slate-700 dark:text-zinc-300 shadow-2xl bg-clip-padding border border-black/10 dark:border-white/10',
  variants: {
    isEntering: {
      true: 'animate-in zoom-in-105 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out zoom-out-95 ease-in duration-200',
    },
  },
});

interface DialogContentProps {}

export function DialogContent({
  children,
}: PropsWithChildren<DialogContentProps>) {
  return (
    <AriaModalOverlay className={overlayStyles}>
      <AriaModal className={modalStyles}>
        <AriaDialog className="outline outline-0 p-6 [[data-placement]>&]:p-4 max-h-[inherit] overflow-auto relative">
          {children}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
