import type { PropsWithChildren } from 'react';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { DialogFooterContainer } from './DialogFooter';

const overlayStyles = tv({
  base: 'fixed top-0 left-0 w-full isolate z-50 bg-gray-800 bg-opacity-30 transition-opacity flex items-center justify-center p-4 text-center [height:100vh] [min-height:100vh]',
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
  base: 'flex w-full max-w-sm max-h-full overflow-auto rounded-[1.125rem] [clip-path:inset(0_0_0_0_round_1.125rem)] bg-white text-left align-middle text-slate-700  shadow-lg shadow-zinc-800/5 border border-black/5',
  variants: {
    isEntering: {
      true: 'animate-in zoom-in-105 ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out zoom-out-95 ease-in duration-200',
    },
  },
});

interface DialogContentProps {
  className?: string;
}

export function DialogContent({
  children,
  className,
}: PropsWithChildren<DialogContentProps>) {
  return (
    <AriaModalOverlay className={overlayStyles}>
      <AriaModal
        isDismissable
        className={composeRenderProps(className, (className, renderProps) =>
          modalStyles({ ...renderProps, className })
        )}
      >
        <AriaDialog className="flex flex-col outline bg-gray-100 rounded-[1.125rem] outline-0 p-1.5 [[data-placement]>&]:p-4 max-h-full relative">
          <DialogFooterContainer>
            <div className="bg-white p-6 border rounded-xl max-h-[inherit] overflow-auto">
              {children}
            </div>
          </DialogFooterContainer>
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
