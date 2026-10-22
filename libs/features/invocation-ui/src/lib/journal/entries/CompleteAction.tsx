import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import {
  ConfirmationDialogBody,
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@restate/ui-dialog';
import {
  FormFieldCode,
  FormFieldInput,
  FormFieldLabel,
  FormFieldTextarea,
} from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { showSuccessNotification } from '@restate/ui-notification';
import { RadioCard, RadioCards, RadioGroup } from '@restate/ui-radio-group';
import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import {
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
  useState,
} from 'react';

type CompleteActionType = 'resolve' | 'reject';

export type CompleteValues =
  | { action: 'resolve'; value: string }
  | { action: 'reject'; message: string; code?: number };

const triggerStyles = tv({
  base: 'flex h-5 shrink-0 items-center gap-1 self-center rounded-md px-1.5 py-0 font-sans text-2xs font-normal text-secondary',
});

export function CompleteActionDialog({
  surface,
  children,
}: PropsWithChildren<{ surface: string }>) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="secondary" className={triggerStyles()}>
          <Icon name={IconName.Return} className="h-3 w-3 shrink-0" />
          Complete…
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" surface={surface}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function showCompletedNotification(
  target: ReactNode,
  action: CompleteActionType,
) {
  showSuccessNotification(
    <>
      <span className="font-mono">{target}</span> has been successfully
      registered for {action === 'resolve' ? 'resolution' : 'rejection'}.
    </>,
  );
}

export function CompleteForm({
  noun,
  target,
  formAction,
  withCode = false,
  isPending,
  error,
  onReset,
  onComplete,
}: {
  noun: 'awakeable' | 'signal';
  target: string;
  formAction: string;
  withCode?: boolean;
  isPending: boolean;
  error: Error | null;
  onReset: VoidFunction;
  onComplete: (values: CompleteValues) => void;
}) {
  const [action, setAction] = useState<CompleteActionType>('resolve');
  const isResolve = action === 'resolve';

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const code = String(formData.get('code') ?? '').trim();

    onComplete(
      isResolve
        ? { action, value: String(formData.get('value') ?? '') }
        : {
            action,
            message: String(formData.get('message') ?? ''),
            ...(code && { code: Number(code) }),
          },
    );
  };

  return (
    <ConfirmationDialogBody
      title={`${isResolve ? 'Resolve' : 'Reject'} ${noun}`}
      icon={isResolve ? IconName.Check : IconName.CircleX}
      iconClassName={isResolve ? undefined : 'text-danger-subtle'}
      description={
        <span className="flex min-w-0 flex-col items-start gap-1.5">
          <span>The invocation is waiting on this {noun}:</span>
          <Badge size="sm" className="max-w-full min-w-0 font-mono">
            <TruncateWithTooltip copyText={target}>
              {target}
            </TruncateWithTooltip>
          </Badge>
        </span>
      }
      submitText={isResolve ? 'Resolve' : 'Reject'}
      closeText="Cancel"
      autoFocusClose={false}
      submitVariant={isResolve ? 'primary' : 'destructive'}
      formMethod="POST"
      formAction={formAction}
      onSubmit={submitHandler}
      isPending={isPending}
      error={error}
    >
      <div className="mt-4 flex flex-col gap-4">
        <RadioGroup
          name="action"
          value={action}
          onChange={(value) => {
            setAction(value as CompleteActionType);
            onReset();
          }}
        >
          <RadioCards className="grid grid-cols-2">
            <RadioCard
              value="resolve"
              label="Resolve"
              description="Complete with a value"
            />
            <RadioCard
              value="reject"
              label="Reject"
              description="Fail with an error"
            />
          </RadioCards>
        </RadioGroup>
        {isResolve ? (
          <div className="flex flex-col">
            <FormFieldLabel>
              <span slot="title">Value</span>
              <span slot="description">
                The {noun}'s result, usually JSON. Leave it empty for no value.
              </span>
            </FormFieldLabel>
            <FormFieldCode
              name="value"
              value=""
              autoFocus
              onInput={onReset}
              className="font-mono"
            />
          </div>
        ) : withCode ? (
          <div className="flex flex-col">
            <FormFieldLabel>
              <span slot="title">Failure</span>
              <span slot="description">
                The {noun} fails with a terminal error. The code defaults to
                500.
              </span>
            </FormFieldLabel>
            <div className="flex items-start gap-2">
              <FormFieldInput
                name="code"
                placeholder="Code"
                maxLength={5}
                className="w-24 shrink-0 [&_input]:min-h-11 [&_input]:font-mono"
              />
              <FailureMessageField className="min-w-0 flex-auto" />
            </div>
          </div>
        ) : (
          <FailureMessageField
            label={
              <>
                <span slot="title">Failure message</span>
                <span slot="description">
                  The {noun} fails with a terminal error carrying this message.
                </span>
              </>
            }
          />
        )}
      </div>
    </ConfirmationDialogBody>
  );
}

const failureMessageStyles = tv({
  base: '[&_textarea]:[field-sizing:content] [&_textarea]:max-h-[45vh] [&_textarea]:min-h-11 [&_textarea]:resize-none [&_textarea]:py-[0.6875rem]',
});

function FailureMessageField({
  label,
  className,
}: {
  label?: ReactNode;
  className?: string;
}) {
  return (
    <FormFieldTextarea
      name="message"
      required
      autoFocus
      rows={1}
      placeholder="Failure message"
      className={failureMessageStyles({ className })}
      label={label}
    />
  );
}
