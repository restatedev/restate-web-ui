import { PropsWithChildren, ReactNode } from 'react';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const overlayStyles = tv({
  base: 'fixed top-0 left-0 w-full min-h-full isolate z-50 bg-gray-800 bg-opacity-30 transition-opacity flex items-center justify-center p-4 text-center',
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
  base: 'w-full max-w-sm max-h-full rounded-xl bg-white text-left align-middle text-slate-700  shadow-lg shadow-zinc-800/5 bg-clip-padding border border-black/5',
  variants: {
    isEntering: {
      true: 'animate-in zoom-in-105 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out zoom-out-95 ease-in duration-200',
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DialogContentProps {
  footer?: ReactNode;
}

export function DialogContent({
  children,
  footer,
}: PropsWithChildren<DialogContentProps>) {
  return (
    <AriaModalOverlay className={overlayStyles}>
      <AriaModal isDismissable className={modalStyles}>
        <AriaDialog className="outline bg-gray-100 rounded-xl outline-0 p-1.5 [[data-placement]>&]:p-4 max-h-[inherit] overflow-auto relative">
          <div className="bg-white p-6 border rounded-xl">{children}</div>
          <div className="py-1 mt-1">{footer}</div>
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
