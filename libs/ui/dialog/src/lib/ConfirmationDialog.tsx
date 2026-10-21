import { Heading } from 'react-aria-components';
import { Form } from 'react-router';
import { Button, SubmitButton } from '@restate/ui-button';
import { ErrorBanner } from '@restate/ui-error';
import { FormEvent, PropsWithChildren, ReactNode, useId } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { DialogFooter } from './DialogFooter';
import { DialogClose } from './DialogClose';
import { DialogContent } from './DialogContent';
import { Dialog, QueryDialog } from './Dialog';
import { tv } from '@restate/util-styles';

interface AlertBannerProps {
  type: 'warning' | 'info';
  children: ReactNode;
}

const styles = tv({
  slots: {
    container: 'mt-2 flex gap-2 rounded-xl p-3 text-0.5xs',
    icon: 'h-5 w-5 shrink-0',
  },
  variants: {
    type: {
      warning: {
        container: 'border border-warning bg-warning-subtle text-warning',
        icon: 'fill-warning text-on-warning',
      },
      info: {
        container: 'border border-info bg-info-subtle text-info',
        icon: 'fill-info text-on-info',
      },
    },
  },
});
function AlertBanner({ type, children }: AlertBannerProps) {
  const { container, icon } = styles({ type });

  return (
    <p className={container()}>
      <Icon
        className={icon()}
        name={type === 'warning' ? IconName.TriangleAlert : IconName.Info}
      />
      <span className="block">{children}</span>
    </p>
  );
}

export interface ConfirmationDialogProps {
  queryParam: string;
  title: string;
  icon?: IconName;
  iconClassName?: string;
  description: ReactNode;
  footer?: ReactNode;
  alertType?: 'warning' | 'info';
  alertContent?: ReactNode;
  submitText: string;
  closeText?: string;
  submitVariant?: 'primary' | 'destructive';
  formMethod?: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  formAction?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending?: boolean;
  isSubmitDisabled?: boolean;
  error?: Error | null;
  onClose?: VoidFunction;
  onCloseQueryParam?: (searchParams: URLSearchParams) => URLSearchParams;
  surface?: string;
  autoFocusClose?: boolean;
}

const iconStyles = tv({
  base: '-ml-2 h-10 w-10 p-1.5 text-info-subtle drop-shadow-md',
});
export function ConfirmationQueryDialog({
  queryParam,
  onClose,
  onCloseQueryParam,
  ...contentProps
}: PropsWithChildren<ConfirmationDialogProps>) {
  return (
    <QueryDialog
      query={queryParam}
      onClose={onClose}
      onCloseQueryParam={onCloseQueryParam}
    >
      <ConfirmationDialogContent {...contentProps} />
    </QueryDialog>
  );
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  ...contentProps
}: PropsWithChildren<
  Omit<ConfirmationDialogProps, 'queryParam' | 'onClose'> & {
    open?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
  }
>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent {...contentProps} />
    </Dialog>
  );
}

function ConfirmationDialogContent({
  surface,
  ...bodyProps
}: PropsWithChildren<Omit<ConfirmationDialogProps, 'queryParam' | 'onClose'>>) {
  return (
    <DialogContent className="max-w-lg" surface={surface}>
      <ConfirmationDialogBody {...bodyProps} />
    </DialogContent>
  );
}

export function ConfirmationDialogBody({
  title,
  icon,
  iconClassName,
  description,
  alertType,
  alertContent,
  submitText,
  submitVariant = 'primary',
  formMethod = 'PATCH',
  formAction,
  onSubmit,
  isPending = false,
  error,
  children,
  footer,
  isSubmitDisabled,
  closeText = 'Close',
  autoFocusClose = true,
}: PropsWithChildren<
  Omit<ConfirmationDialogProps, 'queryParam' | 'onClose' | 'surface'>
>) {
  const formId = useId();

  return (
    <div className="flex flex-col gap-2">
      <Heading
        slot="title"
        level={3}
        className="flex items-center gap-1 text-lg leading-6 font-medium text-primary"
      >
        {icon && (
          <Icon
            name={icon}
            className={iconStyles({ className: iconClassName })}
          />
        )}
        {title}
      </Heading>
      <div className="flex flex-col gap-2 text-sm text-muted">
        {description}
        {alertType && alertContent && (
          <AlertBanner type={alertType}>{alertContent}</AlertBanner>
        )}
      </div>
      <Form
        id={formId}
        method={formMethod}
        action={formAction}
        onSubmit={onSubmit}
      >
        {children}
        <DialogFooter>
          <div className="flex flex-col gap-2">
            {footer}
            {error && <ErrorBanner error={error} />}
            <div className="grid grid-cols-2 gap-2">
              <DialogClose>
                <Button
                  variant="secondary"
                  className=""
                  disabled={isPending}
                  autoFocus={autoFocusClose}
                >
                  {closeText}
                </Button>
              </DialogClose>
              <SubmitButton
                variant={submitVariant}
                form={formId}
                className=""
                disabled={isSubmitDisabled}
              >
                {submitText}
              </SubmitButton>
            </div>
          </div>
        </DialogFooter>
      </Form>
    </div>
  );
}
