import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { SERVICE_RETENTION_EDIT } from './constants';
import { FormEvent, useId } from 'react';
import { Form, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useModifyService,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import {
  FormFieldCombobox,
  ComboBoxSection,
  ComboBoxItem,
} from '@restate/ui/form-field';
import { InlineTooltip } from '@restate/ui/tooltip';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { HUMANTIME_PATTERN_INPUT } from '@restate/util/humantime';
import { Link } from '@restate/ui/link';
import { ErrorBanner } from '@restate/ui/error';
import { Button, SubmitButton } from '@restate/ui/button';

export function EditRetentionDialog() {
  const formId = useId();
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_RETENTION_EDIT);

  const {
    data,
    queryKey,
    error: fetchError,
    isPending,
  } = useServiceDetails(String(service), {
    ...(!service && { enabled: false }),
  });

  const queryClient = useQueryClient();
  const {
    mutate,
    error: mutationError,
    isPending: isSubmitting,
    reset,
  } = useModifyService(String(service), {
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKey, data);
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
    const idempotency_retention = formData.get('idempotency_retention') as
      | string
      | null;
    const journal_retention = formData.get('journal_retention') as
      | string
      | null;
    const workflow_completion_retention = formData.get(
      'workflow_completion_retention',
    ) as string | null;

    mutate({
      parameters: {
        path: { service: String(service) },
      },
      body: {
        public: Boolean(data?.public),
        idempotency_retention: idempotency_retention || null,
        workflow_completion_retention: workflow_completion_retention || null,
        journal_retention: journal_retention || null,
        inactivity_timeout: data?.inactivity_timeout || null,
        abort_timeout: data?.abort_timeout || null,
      },
    });
  };

  const isPendingOrSubmitting = isPending || isSubmitting;

  return (
    <QueryDialog query={SERVICE_RETENTION_EDIT}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Edit retention for <span>{service}</span>
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p className="mt-2 text-sm text-gray-500">
              Creates a new invocation with the same input (if any) from the
              original, leaving the original invocation unchanged.
            </p>
          </div>
          <Form
            id={formId}
            method="PATCH"
            action={`/services/${String(service)}`}
            onSubmit={submitHandler}
          >
            <RestateMinimumVersion minVersion="1.4.5">
              <FormFieldCombobox
                pattern={HUMANTIME_PATTERN_INPUT}
                allowsCustomValue
                defaultValue={data?.journal_retention ?? ''}
                disabled={isPendingOrSubmitting}
                label={
                  <InlineTooltip
                    variant="indicator-button"
                    title="Journal retention"
                    description="How long journal entries are kept after invocation completion"
                  >
                    <span slot="title" className="text-0.5xs">
                      Journal retention
                    </span>
                  </InlineTooltip>
                }
                name="journal_retention"
                className="[&_label]:text-zinc-500"
                placeholder="1day"
              >
                <ComboBoxSection
                  title="Examples"
                  description={
                    <>
                      Choose from the example options above, or enter a custom
                      value in the{' '}
                      <Link
                        href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        jiff friendly
                      </Link>{' '}
                      format.
                    </>
                  }
                >
                  <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
                  <ComboBoxItem value="12h">12h</ComboBoxItem>
                  <ComboBoxItem value="1day">1day</ComboBoxItem>
                  <ComboBoxItem value="7days">7days</ComboBoxItem>
                </ComboBoxSection>
              </FormFieldCombobox>
            </RestateMinimumVersion>
            <FormFieldCombobox
              pattern={HUMANTIME_PATTERN_INPUT}
              allowsCustomValue
              defaultValue={data?.idempotency_retention ?? ''}
              disabled={isPendingOrSubmitting}
              label={
                <InlineTooltip
                  variant="indicator-button"
                  title="Idempotency completion"
                  description="How long the completion result of idempotent invocations is stored"
                >
                  <span slot="title" className="text-0.5xs">
                    Idempotency completion
                  </span>
                </InlineTooltip>
              }
              name="idempotency_retention"
              className="[&_label]:text-zinc-500"
              placeholder="1day"
            >
              <ComboBoxSection
                title="Examples"
                description={
                  <>
                    Choose from the example options above, or enter a custom
                    value in the{' '}
                    <Link
                      href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      jiff friendly
                    </Link>{' '}
                    format.
                  </>
                }
              >
                <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
                <ComboBoxItem value="12h">12h</ComboBoxItem>
                <ComboBoxItem value="1day">1day</ComboBoxItem>
                <ComboBoxItem value="7days">7days</ComboBoxItem>
              </ComboBoxSection>
            </FormFieldCombobox>
            {data?.ty === 'Workflow' && (
              <FormFieldCombobox
                pattern={HUMANTIME_PATTERN_INPUT}
                allowsCustomValue
                disabled={isPendingOrSubmitting}
                className="[&_label]:text-zinc-500"
                defaultValue={data?.workflow_completion_retention ?? ''}
                label={
                  <InlineTooltip
                    variant="indicator-button"
                    title="Workflow completion"
                    description="How long the completion result of workflows is retained (available only for workflow services)"
                  >
                    <span slot="title" className="text-0.5xs">
                      Workflow completion
                    </span>
                  </InlineTooltip>
                }
                name="workflow_completion_retention"
                placeholder="1day"
              >
                <ComboBoxSection
                  title="Examples"
                  description={
                    <>
                      Choose from the example options above, or enter a custom
                      value in the{' '}
                      <Link
                        href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        jiff friendly
                      </Link>{' '}
                      format.
                    </>
                  }
                >
                  <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
                  <ComboBoxItem value="12h">12h</ComboBoxItem>
                  <ComboBoxItem value="1day">1day</ComboBoxItem>
                  <ComboBoxItem value="7days">7days</ComboBoxItem>
                </ComboBoxSection>
              </FormFieldCombobox>
            )}
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
