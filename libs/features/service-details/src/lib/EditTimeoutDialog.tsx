import { Heading } from 'react-aria-components';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { SERVICE_TIMEOUT_EDIT } from './constants';
import { FormEvent, useId } from 'react';
import { Form, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useModifyService,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { InlineTooltip } from '@restate/ui/tooltip';
import { RestateMinimumVersion } from '@restate/features/restate-context';
import { HUMANTIME_PATTERN_INPUT } from '@restate/util/humantime';
import { Link } from '@restate/ui/link';
import { ErrorBanner } from '@restate/ui/error';
import { Button, SubmitButton } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  AbortTimeoutIllustration,
  InactivityTimeoutIllustration,
} from './illustrations';
import { FormFieldCombobox } from '@restate/ui/form-field';
import { useFilter } from 'react-aria';
import { timeoutOptions } from './durationOptions';
import { useDialogDraft } from './useDialogDraft';

export function EditTimeoutDialog() {
  const formId = useId();
  const { startsWith } = useFilter({ sensitivity: 'base' });
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_TIMEOUT_EDIT);

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
          old.delete(SERVICE_TIMEOUT_EDIT);
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
    const inactivity_timeout = formData.get('inactivity_timeout') as
      | string
      | null;
    const abort_timeout = formData.get('abort_timeout') as string | null;

    mutate({
      parameters: {
        path: { service: String(service) },
      },
      body: {
        public: Boolean(data?.public),
        idempotency_retention: data?.idempotency_retention || null,
        workflow_completion_retention:
          data?.workflow_completion_retention || null,
        journal_retention: data?.journal_retention || null,
        inactivity_timeout,
        abort_timeout,
      },
    });
  };

  const isPendingOrSubmitting = isPending || isSubmitting;
  const [draft, setDraft] = useDialogDraft<{
    inactivity: string;
    abort: string;
  }>(service);
  const inactivityPreview = draft.inactivity ?? data?.inactivity_timeout;
  const abortPreview = draft.abort ?? data?.abort_timeout;

  return (
    <QueryDialog query={SERVICE_TIMEOUT_EDIT}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <Heading
            slot="title"
            level={3}
            className="text-lg leading-6 font-medium text-gray-900"
          >
            Timeout configuration for{' '}
            <span className="rounded-sm bg-gray-100 px-[0.5ch] font-mono">
              {service}
            </span>
          </Heading>
          <p className="text-sm text-gray-500">
            Configure timeouts that control how Restate communicates with your
            service deployment.
            <Link
              rel="noopener noreferrer"
              target="_blank"
              variant="secondary"
              className="ml-1 inline-flex items-center gap-1"
              href="https://docs.restate.dev/services/configuration#timeouts"
            >
              Learn more
              <Icon name={IconName.ExternalLink} className="h-[1em] w-[1em]" />
            </Link>
          </p>
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
                  registered. Use the SDK to configure timeout periods
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
            <FormFieldCombobox
              options={timeoutOptions}
              defaultFilter={startsWith}
              pattern={HUMANTIME_PATTERN_INPUT}
              allowsCustomValue
              defaultValue={data?.inactivity_timeout ?? ''}
              onChange={(value) =>
                setDraft((old) => ({ ...old, inactivity: value }))
              }
              disabled={isPendingOrSubmitting}
              label={
                <InlineTooltip
                  variant="indicator-button"
                  title="Inactivity timeout"
                  description="This timer guards against stalled service/handler invocations. Once it expires, Restate triggers a graceful termination by asking the service invocation to suspend (which preserves intermediate progress)"
                >
                  <span slot="title" className="text-0.5xs">
                    Inactivity
                  </span>
                </InlineTooltip>
              }
              name="inactivity_timeout"
              className="[&_label]:text-zinc-500"
              placeholder="1m"
            />
            <FormFieldCombobox
              options={timeoutOptions}
              defaultFilter={startsWith}
              pattern={HUMANTIME_PATTERN_INPUT}
              allowsCustomValue
              disabled={isPendingOrSubmitting}
              className="[&_label]:text-zinc-500"
              defaultValue={data?.abort_timeout ?? ''}
              onChange={(value) =>
                setDraft((old) => ({ ...old, abort: value }))
              }
              placeholder="1m"
              label={
                <InlineTooltip
                  variant="indicator-button"
                  title="Abort timeout"
                  description="This timer guards against stalled service/handler invocations that are supposed to terminate. The abort timeout is started after the 'inactivity timeout' has expired and the service/handler invocation has been asked to gracefully terminate. Once the timer expires, it will abort the service/handler invocation."
                >
                  <span slot="title" className="text-0.5xs">
                    Abort
                  </span>
                </InlineTooltip>
              }
              name="abort_timeout"
            />
            <div className="flex flex-col gap-6 rounded-xl bg-gray-100 px-3 pt-3 pb-2">
              <InactivityTimeoutIllustration inactivity={inactivityPreview} />
              <AbortTimeoutIllustration
                inactivity={inactivityPreview}
                abort={abortPreview}
              />
            </div>
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
