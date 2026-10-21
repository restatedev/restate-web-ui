import { useCompleteAwakeable } from '@restate/data-access-admin-api-hooks';
import { useCodecRuntime } from '@restate/features-codec';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import {
  ConfirmationDialogBody,
  Dialog,
  DialogContent,
  DialogTrigger,
  useDialog,
} from '@restate/ui-dialog';
import {
  FormFieldCode,
  FormFieldLabel,
  FormFieldTextarea,
} from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { showSuccessNotification } from '@restate/ui-notification';
import { RadioGroup } from '@restate/ui-radio-group';
import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Radio } from 'react-aria-components';

type AwakeableAction = 'resolve' | 'reject';

const triggerStyles = tv({
  base: 'flex h-5 shrink-0 items-center gap-1 self-center rounded-md px-1.5 py-0 font-sans text-2xs font-normal text-secondary',
});

const actionRadioStyles = tv({
  base: 'group relative flex cursor-default rounded-lg border bg-clip-padding px-3 py-2 shadow-none outline-none',
  variants: {
    isFocusVisible: {
      true: 'ring-2 ring-focus ring-offset-1 ring-offset-surface/80',
    },
    isSelected: {
      true: 'border text-primary shadow-sm',
      false: 'border-transparent text-muted',
    },
    isPressed: { true: '', false: '' },
  },
  compoundVariants: [
    { isSelected: true, isPressed: true, className: 'bg-subtle' },
    { isSelected: true, isPressed: false, className: 'bg-surface' },
    { isSelected: false, isPressed: true, className: 'bg-muted' },
    { isSelected: false, isPressed: false, className: 'bg-surface/50' },
  ],
});

export function CompleteAwakeableAction({
  awakeableId,
  invocationId,
}: {
  awakeableId: string;
  invocationId: string;
}) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="secondary" className={triggerStyles()}>
          <Icon name={IconName.Return} className="h-3 w-3 shrink-0" />
          Complete…
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" surface="complete-awakeable">
        <CompleteAwakeableForm
          awakeableId={awakeableId}
          invocationId={invocationId}
        />
      </DialogContent>
    </Dialog>
  );
}

function CompleteAwakeableForm({
  awakeableId,
  invocationId,
}: {
  awakeableId: string;
  invocationId: string;
}) {
  const [action, setAction] = useState<AwakeableAction>('resolve');
  const { close } = useDialog();
  const { encode } = useCodecRuntime();
  const mutation = useCompleteAwakeable(invocationId, {
    encode,
    onSuccess(_data, variables) {
      close?.();
      showSuccessNotification(
        <>
          <span className="font-mono">{variables.awakeableId}</span> has been
          successfully registered for{' '}
          {variables.action === 'resolve' ? 'resolution' : 'rejection'}.
        </>,
      );
    },
  });
  const isResolve = action === 'resolve';

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    mutation.mutate(
      isResolve
        ? { awakeableId, action, value: String(formData.get('value') ?? '') }
        : {
            awakeableId,
            action,
            message: String(formData.get('message') ?? ''),
          },
    );
  };

  return (
    <ConfirmationDialogBody
      title={isResolve ? 'Resolve awakeable' : 'Reject awakeable'}
      icon={isResolve ? IconName.Check : IconName.CircleX}
      iconClassName={isResolve ? undefined : 'text-danger-subtle'}
      description={
        <span className="flex min-w-0 flex-col items-start gap-1.5">
          <span>The invocation is waiting on this awakeable:</span>
          <Badge size="sm" className="max-w-full min-w-0 font-mono">
            <TruncateWithTooltip copyText={awakeableId}>
              {awakeableId}
            </TruncateWithTooltip>
          </Badge>
        </span>
      }
      alertType="info"
      alertContent="Restate accepts the request without checking that the awakeable is still pending. The invocation continues once it receives the result."
      submitText={isResolve ? 'Resolve' : 'Reject'}
      closeText="Cancel"
      autoFocusClose={false}
      submitVariant={isResolve ? 'primary' : 'destructive'}
      formMethod="POST"
      formAction={`/invocations/${invocationId}/awakeables`}
      onSubmit={submitHandler}
      isPending={mutation.isPending}
      error={mutation.error}
    >
      <div className="mt-4 flex flex-col gap-4">
        <RadioGroup
          name="action"
          value={action}
          onChange={(value) => {
            setAction(value as AwakeableAction);
            mutation.reset();
          }}
          className="grid grid-cols-2 gap-1 rounded-lg border border-default bg-muted p-1 shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)]"
        >
          <ActionRadio
            value="resolve"
            label="Resolve"
            description="Complete with a value"
          />
          <ActionRadio
            value="reject"
            label="Reject"
            description="Fail with an error"
          />
        </RadioGroup>
        {isResolve ? (
          <div className="flex flex-col">
            <FormFieldLabel>
              <span slot="title">Value</span>
              <span slot="description">
                The awakeable's result, usually JSON. Leave it empty for no
                value.
              </span>
            </FormFieldLabel>
            <FormFieldCode
              name="value"
              value=""
              autoFocus
              onInput={mutation.reset}
              className="font-mono"
            />
          </div>
        ) : (
          <FormFieldTextarea
            name="message"
            required
            autoFocus
            rows={1}
            placeholder="Failure message"
            className="[&_textarea]:[field-sizing:content] [&_textarea]:max-h-[45vh] [&_textarea]:min-h-11 [&_textarea]:resize-none [&_textarea]:py-[0.6875rem]"
            label={
              <>
                <span slot="title">Failure message</span>
                <span slot="description">
                  The awakeable fails with a terminal error carrying this
                  message.
                </span>
              </>
            }
          />
        )}
      </div>
    </ConfirmationDialogBody>
  );
}

function ActionRadio({
  value,
  label,
  description,
}: {
  value: AwakeableAction;
  label: string;
  description: ReactNode;
}) {
  return (
    <Radio
      value={value}
      className={({ isFocusVisible, isSelected, isPressed }) =>
        actionRadioStyles({ isFocusVisible, isSelected, isPressed })
      }
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-0.5xs font-normal text-muted">{description}</div>
        </div>
        <div className="invisible flex shrink-0 items-center group-selected:visible">
          <Icon name={IconName.Check} className="h-4 w-4" />
        </div>
      </div>
    </Radio>
  );
}
