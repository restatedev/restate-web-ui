import type { PropsWithChildren } from 'react';
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { DialogFooterContainer } from './DialogFooter';

const overlayStyles = tv({
  base: 'fixed top-0 left-0 isolate z-100 flex h-screen min-h-screen w-full bg-gray-800/30 text-center backdrop-blur-[0.5px] transition-opacity',
  variants: {
    isEntering: {
      true: 'duration-200 ease-out animate-in fade-in',
    },
    isExiting: {
      true: 'duration-200 ease-in animate-out fade-out',
    },
    variant: {
      sheet: 'items-end justify-center px-0 pt-4 pb-0 lg:px-4',
      modal: 'items-center justify-center p-4',
    },
  },
  defaultVariants: { variant: 'modal' },
});

const modalStyles = tv({
  base: 'flex max-h-full overflow-auto border border-black/5 bg-white text-left align-middle text-slate-700',
  variants: {
    isEntering: {
      true: 'duration-200 ease-out animate-in',
    },
    isExiting: {
      true: 'duration-200 ease-in animate-out',
    },
    variant: {
      sheet: 'h-[95vh] w-screen rounded-t-[1.125rem] border-b-0 lg:w-[95vw]',
      modal:
        'w-full max-w-sm rounded-[1.125rem] [clip-path:inset(0_0_0_0_round_1.125rem)]',
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
      className: 'fade-out slide-out-to-bottom',
    },
    {
      isEntering: true,
      variant: 'modal',
      className: 'zoom-in-105',
    },
    {
      isExiting: true,
      variant: 'modal',
      className: 'zoom-out-95',
    },
  ],
  defaultVariants: { variant: 'modal' },
});

const dialogStyles = tv({
  base: 'relative flex max-h-full w-full flex-col bg-gray-100 p-1.5 outline outline-0 [[data-placement]>&]:p-4',
  variants: {
    variant: {
      sheet: 'rounded-t-[1.125rem] pb-0',
      modal: 'rounded-[1.125rem]',
    },
  },
  defaultVariants: { variant: 'modal' },
});

const contentStyles = tv({
  base: 'max-h-[inherit] overflow-auto border bg-white',
  variants: {
    variant: {
      sheet: 'h-full rounded-t-xl border-b-0',
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
    <AriaModalOverlay
      className={overlayStyles({ variant })}
      isDismissable
      shouldCloseOnInteractOutside={(el) => {
        const tooltip = el.closest('[role=tooltip]');
        return !tooltip;
      }}
    >
      <AriaModal
        isDismissable
        className={composeRenderProps(className, (className, renderProps) =>
          modalStyles({ ...renderProps, className, variant }),
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
