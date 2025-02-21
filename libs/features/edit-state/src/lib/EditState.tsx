import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { Form } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldCode } from '@restate/ui/form-field';
import {
  createContext,
  Dispatch,
  FormEvent,
  PropsWithChildren,
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
    key?: string;
    objectKey?: string;
    service?: string;
  }>({ isEditing: false, key: undefined, objectKey: undefined });
  return (
    <EditStateContext.Provider value={{ ...editState, setEditState }}>
      <EditStateInner
        isOpen={editState.isEditing}
        service={editState.service}
        objectKey={editState.objectKey}
        stateKey={editState.key}
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
}: PropsWithChildren<{
  service?: string;
  stateKey?: string;
  objectKey?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}>) {
  const formId = useId();

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

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = formData.get('value');
    if (typeof value === 'string') {
      const obj: Record<string, string | undefined> = isPartial
        ? { [key]: value || undefined }
        : stringifyValues(JSON.parse(value));
      mutation.mutate({ state: obj, partial: isPartial });
    }
  };

  const error = query.error || mutation.error;

  const { data: queue } = useGetVirtualObjectQueue(
    String(service),
    String(objectKey),
    undefined,
    { enabled: Boolean(objectKey && service) }
  );
  const hasActiveInvocations = (queue?.size ?? 0) > 0;

  const { banner, bannerIcon } = styles({
    isWarning: hasActiveInvocations && isPartial,
  });
  console.log(isOpen, service, objectKey);
  return (
    <Dialog
      open={Boolean(isOpen && service && objectKey)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          mutation.reset();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {isPartial ? (
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
                Update <code>{service}</code> state for{' '}
                <code className="rounded bg-gray-100 px-[0.5ch]">
                  {objectKey}
                </code>
              </>
            )}
          </h3>
          <p className={banner()}>
            <Icon
              className={bannerIcon()}
              name={
                hasActiveInvocations && isPartial
                  ? IconName.TriangleAlert
                  : IconName.Info
              }
            />
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
            </span>
          </p>
          <Form
            id={formId}
            method="POST"
            action={`/services/${service}/state`}
            onSubmit={submitHandler}
          >
            <p className="text-sm text-gray-500 mt-2">
              Please update the current value:
            </p>
            {query.data && (
              <FormFieldCode
                autoFocus
                name="value"
                className="mt-2 font-mono overflow-auto"
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
                      value: query.data?.state.find((s) => s.name === key)
                        ?.value,
                    })}
              />
            )}
            <DialogFooter>
              <div className="flex gap-2 flex-col">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <SubmitButton form={formId} className="flex-auto">
                    Save
                  </SubmitButton>
                </div>
              </div>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
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
