import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { SERVICE_ACCESS_EDIT } from './constants';
import { FormEvent, ReactNode, useId } from 'react';
import { Form, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useModifyService,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { Link } from '@restate/ui/link';
import { ErrorBanner } from '@restate/ui/error';
import { Button, SubmitButton } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import { FormFieldLabel } from '@restate/ui/form-field';

export function EditAccessDialog() {
  const formId = useId();
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_ACCESS_EDIT);

  const {
    data,
    queryKey,
    error: fetchError,
    isPending,
  } = useServiceDetails(String(service), {
    ...(!service && { enabled: false }),
  });
  const [, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const {
    mutate,
    error: mutationError,
    isPending: isSubmitting,
    reset,
  } = useModifyService(String(service), {
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKey, data);
      setSearchParams(
        (old) => {
          old.delete(SERVICE_ACCESS_EDIT);
          return old;
        },
        { preventScrollReset: true },
      );
      showSuccessNotification(
        <>
          "{variables.parameters?.path.service}" has been successfully updated.
        </>,
      );
    },
  });

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const isPublic = formData.get('public') === 'true';

    mutate({
      parameters: {
        path: { service: String(service) },
      },
      body: {
        public: isPublic,
        idempotency_retention: data?.idempotency_retention || null,
        workflow_completion_retention:
          data?.workflow_completion_retention || null,
        journal_retention: data?.journal_retention || null,
        inactivity_timeout: data?.inactivity_timeout || null,
        abort_timeout: data?.abort_timeout || null,
      },
    });
  };

  const isPendingOrSubmitting = isPending || isSubmitting;
  return (
    <QueryDialog query={SERVICE_ACCESS_EDIT}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Ingress access for{' '}
            <span className="rounded-sm bg-gray-100 px-[0.5ch] font-mono">
              {service}
            </span>
          </h3>
          <RestateMinimumVersion minVersion="1.4.5">
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <p className="mt-2 flex gap-2 rounded-xl bg-orange-50 p-3 text-sm text-0.5xs text-orange-600">
                <Icon
                  className="h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
                  name={IconName.TriangleAlert}
                />
                <span className="inline-block">
                  Any changes made here are{' '}
                  <span className="font-semibold">temporary</span> and remain in
                  effect only until the service is next discovered and
                  registered. Use the SDK to configure ingress access
                  permanently.
                </span>
              </p>
            </div>
          </RestateMinimumVersion>
          <Form
            id={formId}
            method="PATCH"
            action={`/services/${String(service)}`}
            onSubmit={submitHandler}
            className="mt-2 flex flex-col gap-4"
            key={String(isPending)}
          >
            <RadioGroup
              name="public"
              required
              className="mt-2"
              defaultValue={String(data?.public)}
              disabled={isPendingOrSubmitting}
            >
              <FormFieldLabel>
                <span slot="description">
                  Choose how your service should be accessed:
                </span>
              </FormFieldLabel>
              <div className="mt-0 flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-100 px-1 py-1 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
                <CustomRadio
                  value="true"
                  label="Public"
                  description={<>accessible via ingress (HTTP/Kafka)</>}
                />
                <CustomRadio
                  value="false"
                  label="Private"
                  description={<>only accessible from other Restate services</>}
                />
              </div>
            </RadioGroup>
          </Form>
          <DialogFooter>
            <div className="flex flex-col gap-2">
              {(fetchError || mutationError) && (
                <ErrorBanner errors={[fetchError, mutationError]} />
              )}
              <div className="flex gap-2">
                <DialogClose>
                  <Button
                    variant="secondary"
                    className="flex-auto"
                    disabled={isPending}
                    onClick={() => reset()}
                  >
                    Close
                  </Button>
                </DialogClose>
                <SubmitButton form={formId} className="flex-auto">
                  Save
                </SubmitButton>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}

function CustomRadio({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: ReactNode;
}) {
  return (
    <Radio
      value={value}
      className={({ isFocusVisible, isSelected, isPressed }) =>
        `group relative flex cursor-default rounded-lg border bg-clip-padding px-4 py-3 shadow-none outline-none ${
          isFocusVisible
            ? 'ring-2 ring-blue-600 ring-offset-1 ring-offset-white/80'
            : ''
        } ${
          isSelected
            ? `${
                isPressed ? 'bg-gray-50' : 'bg-white'
              } border text-gray-800 shadow-sm`
            : 'border-transparent text-gray-500'
        } ${isPressed && !isSelected ? 'bg-gray-100' : ''} ${!isSelected && !isPressed ? 'bg-white/50' : ''} `
      }
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="inline text-sm font-normal text-gray-500">
            {description}
          </div>
        </div>
        <div className="invisible flex shrink-0 items-center group-selected:visible">
          <Icon name={IconName.Check} />
        </div>
      </div>
    </Radio>
  );
}
