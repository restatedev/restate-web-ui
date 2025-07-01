import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { Form } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldCode, FormFieldInput } from '@restate/ui/form-field';
import {
  createContext,
  Dispatch,
  FormEvent,
  FormEventHandler,
  PropsWithChildren,
  ReactNode,
  use,
  useId,
  useState,
} from 'react';
import {
  convertStateToObject,
  useEditState,
  useGetVirtualObjectQueue,
} from '@restate/data-access/admin-api';
import { showSuccessNotification } from '@restate/ui/notification';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@restate/ui/loading';

const styles = tv({
  base: '',
  slots: {
    banner: 'mt-2 text-code flex rounded-xl p-3  gap-2',
    bannerIcon: 'h-5 w-5  shrink-0',
  },
  variants: {
    isWarning: {
      true: {
        banner: 'bg-orange-50 text-orange-600',
        bannerIcon: 'text-orange-100 fill-orange-600',
      },
      false: {
        banner: 'bg-blue-50 text-blue-600',
        bannerIcon: 'text-blue-100 fill-blue-600',
      },
    },
  },
});

const EditStateContext = createContext<{
  isEditing: boolean;
  key?: string;
  objectKey?: string;
  service?: string;
  setEditState: Dispatch<
    React.SetStateAction<{
      isEditing: boolean;
      isDeleting: boolean;
      key?: string;
      service?: string;
      objectKey?: string;
    }>
  >;
}>({
  isEditing: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setEditState: () => {},
});

export function useEditStateContext() {
  return use(EditStateContext).setEditState;
}

export function EditState({ children }: PropsWithChildren) {
  const [editState, setEditState] = useState<{
    isEditing: boolean;
    isDeleting: boolean;
    key?: string;
    objectKey?: string;
    service?: string;
  }>({
    isEditing: false,
    isDeleting: false,
    key: undefined,
    objectKey: undefined,
  });
  return (
    <EditStateContext.Provider value={{ ...editState, setEditState }}>
      <EditStateInner
        isOpen={editState.isEditing}
        service={editState.service}
        objectKey={editState.objectKey}
        stateKey={editState.key}
        isDeleting={editState.isDeleting}
        onOpenChange={(isEditing) => setEditState((s) => ({ ...s, isEditing }))}
      />
      {children}
    </EditStateContext.Provider>
  );
}

function EditStateInner({
  service,
  objectKey,
  stateKey: key,
  isOpen,
  onOpenChange,
  isDeleting,
}: PropsWithChildren<{
  service?: string;
  stateKey?: string;
  objectKey?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isDeleting?: boolean;
}>) {
  const { mutation, query } = useEditState(String(service), String(objectKey), {
    enabled: Boolean(service && objectKey),
    onSuccess(data, variables) {
      onOpenChange(false);
      showSuccessNotification(
        'The state mutation has been successfully accepted for processing.'
      );
    },
  });
  const isPartial = typeof key === 'string';

  const {
    data: queue,
    queryKey,
    isFetching,
  } = useGetVirtualObjectQueue(String(service), String(objectKey), undefined, {
    enabled: Boolean(objectKey && service && isOpen),
    staleTime: 0,
    refetchOnMount: true,
  });
  const queryClient = useQueryClient();
  const hasActiveInvocations = (queue?.size ?? 0) > 0;

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = isDeleting ? '{}' : formData.get('value');
    if (typeof value === 'string') {
      try {
        const obj: Record<string, string | undefined> = isPartial
          ? { [key]: value || undefined }
          : stringifyValues(JSON.parse(value));
        mutation.mutate({ state: obj, partial: isPartial });
      } catch (error) {
        mutation.mutate({ state: value as any, partial: isPartial });
      }
    }
  };
  const error = query.error || mutation.error;

  return (
    <Dialog
      open={Boolean(isOpen && service && objectKey)}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          mutation.reset();
        }
        isOpen && queryClient.invalidateQueries({ queryKey });
      }}
    >
      <StateDialogContent
        service={service}
        stateKey={key}
        hasActiveInvocations={hasActiveInvocations}
        isDeleting={isDeleting}
        isFetching={isFetching}
        error={error}
        onSubmit={submitHandler}
        isSubmitting={mutation.isPending}
        title={
          isPartial ? (
            <>
              Update "
              <code className="rounded bg-gray-100 px-[0.5ch]">{key}</code>"{' '}
              value in <code>{service}</code> state for{' '}
              <code className="rounded bg-gray-100 px-[0.5ch]">
                {objectKey}
              </code>
            </>
          ) : (
            <>
              {isDeleting ? 'Delete' : 'Replace'} <code>{service}</code> state
              for{' '}
              <code className="rounded bg-gray-100 px-[0.5ch]">
                {objectKey}
              </code>
            </>
          )
        }
      >
        {isDeleting && (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Please confirm to proceed or close to keep the state.
            </p>
            <FormFieldInput
              autoFocus
              required
              pattern="delete"
              name="confirm"
              className="mt-2"
              placeholder='Type "delete" to confirm'
              errorMessage={(errors) => {
                const isMisMatch =
                  errors.validationDetails.patternMismatch &&
                  !errors.validationDetails.valueMissing;
                if (isMisMatch) {
                  return 'Type "delete" to confirm';
                }
                return errors.validationErrors;
              }}
            />
          </>
        )}
        {query.data && !isDeleting && (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Please update the current value:
            </p>
            <FormFieldCode
              autoFocus
              name="value"
              className="mt-2 font-mono overflow-auto"
              onInput={mutation.reset}
              {...(typeof key === 'undefined'
                ? {
                    value: JSON.stringify(
                      convertStateToObject(
                        query.data?.state.map((a) => ({
                          ...a,
                          value: safeParse(a.value),
                        }))
                      ),
                      null,
                      4
                    ),
                  }
                : {
                    value: query.data?.state.find((s) => s.name === key)?.value,
                  })}
            />
          </>
        )}
      </StateDialogContent>
    </Dialog>
  );
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (error) {
    if (value === '') {
      return undefined;
    } else {
      return value;
    }
  }
}

function stringifyValues(state: Record<string, any>) {
  return convertStateToObject(
    Array.from(Object.entries(state)).map(([name, value]) => ({
      name,
      value: JSON.stringify(value),
    }))
  );
}

function StateDialogContent({
  children,
  service,
  stateKey: key,
  hasActiveInvocations,
  isDeleting,
  isFetching,
  title,
  onSubmit,
  error,
  isSubmitting,
}: PropsWithChildren<{
  service?: string;
  stateKey?: string;
  hasActiveInvocations?: boolean;
  isDeleting?: boolean;
  isFetching?: boolean;
  isSubmitting?: boolean;
  title?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  error?: Error | null;
}>) {
  const isPartial = typeof key === 'string';
  const { banner, bannerIcon } = styles({
    isWarning: (hasActiveInvocations && isPartial) || !isPartial,
  });

  const formId = useId();

  return (
    <DialogContent className="max-w-2xl">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
        <div className={banner()}>
          {isFetching ? (
            <div className="h-5 w-5 shrink-0 px-0.5">
              <Spinner className="h-full w-full text-orange-500" />
            </div>
          ) : (
            <Icon
              className={bannerIcon()}
              name={
                (hasActiveInvocations && isPartial) || !isPartial
                  ? IconName.TriangleAlert
                  : IconName.Info
              }
            />
          )}
          <span className="block">
            {hasActiveInvocations
              ? 'Currently, there are active invocations associated with this key. This mutation will be queued for processing once those invocations are complete.'
              : 'This mutation will be enqueued to be processed after any active invocations on this key.'}
            {hasActiveInvocations && isPartial && (
              <>
                <br />
                If the state of this key changes before this mutation is
                processed, the mutation will be discarded.
              </>
            )}
            {!isPartial && (
              <>
                <br />
                The new state will <strong>replace</strong> the previous state.
              </>
            )}
          </span>
        </div>
        <Form
          id={formId}
          method="POST"
          action={`/services/${service}/state`}
          onSubmit={onSubmit}
        >
          {children}

          <DialogFooter>
            <div className="flex gap-2 flex-col">
              {error && <ErrorBanner error={error} />}
              <div className="flex gap-2">
                <DialogClose>
                  <Button
                    variant="secondary"
                    className="flex-auto"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <SubmitButton
                  form={formId}
                  className="flex-auto"
                  variant={isDeleting ? 'destructive' : 'primary'}
                >
                  {isDeleting ? 'Delete' : 'Save'}
                </SubmitButton>
              </div>
            </div>
          </DialogFooter>
        </Form>
      </div>
    </DialogContent>
  );
}
