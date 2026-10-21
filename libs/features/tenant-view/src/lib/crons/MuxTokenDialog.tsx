import { useRestateContext } from '@restate/features-restate-context';
import { Button, SubmitButton } from '@restate/ui-button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui-dialog';
import { FormFieldInput } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { type FormEvent, useId } from 'react';
import { Heading } from 'react-aria-components';
import { setMuxToken } from './cronApi';

export function MuxTokenDialog({
  open,
  onOpenChange,
  isRejected,
}: {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isRejected: boolean;
}) {
  const formId = useId();
  const { ingressMuxUrl } = useRestateContext();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get('token') ?? '');
    if (token.trim()) {
      setMuxToken(token.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <Heading
            slot="title"
            level={3}
            className="text-lg leading-6 font-medium text-primary"
          >
            Ingress mux token
          </Heading>
          <p className="text-sm text-muted">
            Crons are managed through the ingress mux at{' '}
            <span className="font-mono break-all">{ingressMuxUrl}</span>, as the
            operator. Paste the operator token; it’s kept in this browser.
          </p>
          {isRejected && (
            <p className="mt-1 flex gap-2 rounded-xl border border-warning bg-warning-subtle p-3 text-0.5xs text-warning">
              <Icon
                name={IconName.TriangleAlert}
                className="h-5 w-5 shrink-0 fill-warning text-on-warning"
              />
              The ingress mux rejected the token. Paste a valid operator token.
            </p>
          )}
          <form id={formId} onSubmit={onSubmit} className="mt-2">
            <FormFieldInput
              name="token"
              type="password"
              label="Operator token"
              required
              autoFocus
            />
          </form>
          <DialogFooter>
            <div className="grid grid-cols-2 gap-2">
              <DialogClose>
                <Button variant="secondary">Close</Button>
              </DialogClose>
              <SubmitButton form={formId}>Save</SubmitButton>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
