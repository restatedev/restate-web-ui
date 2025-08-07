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
  base: 'fixed top-0 left-0 w-full isolate z-100 bg-gray-800/30 transition-opacity flex text-center h-screen min-h-screen',
  variants: {
    isEntering: {
      true: 'animate-in fade-in duration-200 ease-out',
    },
    isExiting: {
      true: 'animate-out fade-out duration-200 ease-in',
    },
    variant: {
      sheet: 'pb-0 px-0 lg:px-4 pt-4 items-end justify-center',
      modal: 'p-4 items-center justify-center',
    },
  },
  defaultVariants: { variant: 'modal' },
});

const modalStyles = tv({
  base: 'flex max-h-full overflow-auto  bg-white text-left align-middle text-slate-700  shadow-lg shadow-zinc-800/5 border border-black/5',
  variants: {
    isEntering: {
      true: 'animate-in ease-out duration-200',
    },
    isExiting: {
      true: 'animate-out ease-in duration-200',
    },
    variant: {
      sheet: 'w-screen lg:w-[95vw] h-[95vh] rounded-t-[1.125rem] border-b-0',
      modal:
        'w-full max-w-sm [clip-path:inset(0_0_0_0_round_1.125rem)] rounded-[1.125rem]',
    },
  },
  compoundVariants: [
    {
      isEntering: true,
      variant: 'sheet',
      className: 'slide-in-from-bottom',
    },
    {
      isExiting: true,
      variant: 'sheet',
      className: 'slide-out-to-bottom fade-out',
    },
    {
      isEntering: true,
      variant: 'modal',
      className: 'zoom-in-105',
    },
    {
      isExiting: true,
      variant: 'modal',
      className: 'zoom-out-95 ',
    },
  ],
  defaultVariants: { variant: 'modal' },
});

const dialogStyles = tv({
  base: 'flex flex-col outline bg-gray-100 outline-0 p-1.5 [[data-placement]>&]:p-4 max-h-full w-full relative',
  variants: {
    variant: {
      sheet: 'rounded-t-[1.125rem] pb-0',
      modal: 'rounded-[1.125rem]',
    },
  },
  defaultVariants: { variant: 'modal' },
});

const contentStyles = tv({
  base: 'bg-white  border max-h-[inherit] overflow-auto',
  variants: {
    variant: {
      sheet: 'rounded-t-xl border-b-0 h-full',
      modal: 'rounded-xl p-6',
    },
  },
  defaultVariants: { variant: 'modal' },
});

interface DialogContentProps {
  className?: string;
  variant?: 'modal' | 'sheet';
}

export function DialogContent({
  children,
  className,
  variant = 'modal',
}: PropsWithChildren<DialogContentProps>) {
  return (
    <AriaModalOverlay className={overlayStyles({ variant })} isDismissable>
      <AriaModal
        isDismissable
        className={composeRenderProps(className, (className, renderProps) =>
          modalStyles({ ...renderProps, className, variant })
        )}
      >
        <AriaDialog className={dialogStyles({ variant })}>
          <DialogFooterContainer>
            <div className={contentStyles({ variant })}>{children}</div>
          </DialogFooterContainer>
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
