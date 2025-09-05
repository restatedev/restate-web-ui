import {
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
import { Icon, IconName } from '@restate/ui/icons';
import {
  IdempotencyRetentionExplainer,
  JournalRetentionExplainer,
  WorkflowRetentionExplainer,
} from '@restate/features/explainers';

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
          old.delete(SERVICE_RETENTION_EDIT);
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
  const isWorkflow = data?.ty === 'Workflow';

  return (
    <QueryDialog query={SERVICE_RETENTION_EDIT}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Retention configuration for{' '}
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
                  registered. Use the SDK to configure retention periods
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
            {isWorkflow && (
              <FormFieldCombobox
                pattern={HUMANTIME_PATTERN_INPUT}
                allowsCustomValue
                disabled={isPendingOrSubmitting}
                className="[&_label]:text-zinc-500"
                defaultValue={data?.workflow_completion_retention ?? ''}
                label={
                  <WorkflowRetentionExplainer variant="indicator-button">
                    Workflow completion
                  </WorkflowRetentionExplainer>
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

            <FormFieldCombobox
              pattern={HUMANTIME_PATTERN_INPUT}
              allowsCustomValue
              defaultValue={data?.idempotency_retention ?? ''}
              disabled={isPendingOrSubmitting}
              label={
                <IdempotencyRetentionExplainer
                  variant="indicator-button"
                  isWorkflow={isWorkflow}
                >
                  Idempotency completion
                </IdempotencyRetentionExplainer>
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
            <RestateMinimumVersion minVersion="1.4.5">
              <FormFieldCombobox
                pattern={HUMANTIME_PATTERN_INPUT}
                allowsCustomValue
                defaultValue={data?.journal_retention ?? ''}
                disabled={isPendingOrSubmitting}
                label={
                  <JournalRetentionExplainer variant="indicator-button">
                    Journal retention
                  </JournalRetentionExplainer>
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
