import { Form } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, PropsWithChildren, ReactNode, useId } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { DialogFooter } from './DialogFooter';
import { DialogClose } from './DialogClose';
import { DialogContent } from './DialogContent';
import { QueryDialog } from './Dialog';
import { tv } from '@restate/util/styles';

interface AlertBannerProps {
  type: 'warning' | 'info';
  children: ReactNode;
}

function AlertBanner({ type, children }: AlertBannerProps) {
  const styles = {
    warning: {
      container: 'bg-orange-100 text-orange-600',
      icon: 'fill-orange-600 text-orange-100',
    },
    info: {
      container: 'bg-blue-50 text-blue-600',
      icon: 'fill-blue-600 text-blue-100',
    },
  };

  const { container, icon } = styles[type];

  return (
    <p className={`mt-2 flex gap-2 rounded-xl ${container} p-3 text-0.5xs`}>
      <Icon
        className={`h-5 w-5 shrink-0 ${icon}`}
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
  alertType?: 'warning' | 'info';
  alertContent?: ReactNode;
  submitText: string;
  submitVariant?: 'primary' | 'destructive';
  formMethod?: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  formAction?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending?: boolean;
  error?: Error | null;
  onClose?: VoidFunction;
}

const iconStyles = tv({
  base: '-ml-2 h-10 w-10 fill-blue-50 p-1.5 text-blue-400 drop-shadow-md',
});
export function ConfirmationDialog({
  queryParam,
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
  onClose,
  children,
}: PropsWithChildren<ConfirmationDialogProps>) {
  const formId = useId();

  return (
    <QueryDialog query={queryParam} onClose={onClose}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 text-lg leading-6 font-medium text-gray-900">
            {icon && (
              <Icon
                name={icon}
                className={iconStyles({ className: iconClassName })}
              />
            )}
            {title}
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
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
                {error && <ErrorBanner error={error} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
                      autoFocus
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton
                    variant={submitVariant}
                    form={formId}
                    className="flex-auto"
                  >
                    {submitText}
                  </SubmitButton>
                </div>
              </div>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}
