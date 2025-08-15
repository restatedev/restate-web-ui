import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  useParamValue,
  ComplementaryFooter,
} from '@restate/ui/layout';
import { SERVICE_QUERY_PARAM } from '../constants';
import {
  CollapsibleSection,
  CollapsibleSectionContent,
  CollapsibleSectionTitle,
  Section,
  SectionContent,
  SectionTitle,
} from '@restate/ui/section';
import {
  useListDeployments,
  useModifyService,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { Form } from 'react-router';
import { Handler } from '../Handler';
import { Icon, IconName } from '@restate/ui/icons';
import { ServiceType } from '../ServiceType';
import { Deployment } from '../Deployment';
import {
  ComboBoxItem,
  ComboBoxSection,
  FormFieldCheckbox,
  FormFieldCombobox,
} from '@restate/ui/form-field';
import { InlineTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { HUMANTIME_PATTERN_INPUT } from '@restate/util/humantime';
import { FormEvent, useEffect, useId, useState } from 'react';
import { Link } from '@restate/ui/link';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBanner } from '@restate/ui/error';
import { ServicePlaygroundTrigger } from '../ServicePlayground';
import { showSuccessNotification } from '@restate/ui/notification';

export function ServiceDetails() {
  return (
    <ComplementaryWithSearchParam paramName={SERVICE_QUERY_PARAM}>
      <ServiceDetailsContent />
    </ComplementaryWithSearchParam>
  );
}

function ServiceDetailsContent() {
  const formId = useId();
  const service = useParamValue();
  const [key, setKey] = useState(0);
  const {
    data,
    queryKey,
    error: fetchError,
    isPending,
  } = useServiceDetails(String(service), {
    ...(!service && { enabled: false }),
  });

  useEffect(() => {
    setKey((k) => k + 1);
  }, [data]);

  const queryClient = useQueryClient();
  const {
    mutate,
    error: mutationError,
    isPending: isSubmitting,
  } = useModifyService(String(service), {
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKey, data);
      showSuccessNotification(
        <>
          "{variables.parameters?.path.service}" has been successfully updated.
        </>,
      );
      setKey((k) => k + 1);
    },
  });
  const error = fetchError ?? mutationError;

  if (!service) {
    return null;
  }

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const isPublic = formData.get('public') === 'true';
    const idempotency_retention = formData.get('idempotency_retention') as
      | string
      | null;
    const journal_retention = formData.get('journal_retention') as
      | string
      | null;
    const workflow_completion_retention = formData.get(
      'workflow_completion_retention',
    ) as string | null;
    const inactivity_timeout = formData.get('inactivity_timeout') as
      | string
      | null;
    const abort_timeout = formData.get('abort_timeout') as string | null;

    mutate({
      parameters: {
        path: { service: String(service) },
      },
      body: {
        public: isPublic,
        idempotency_retention: idempotency_retention || null,
        workflow_completion_retention: workflow_completion_retention || null,
        inactivity_timeout: inactivity_timeout || null,
        abort_timeout: abort_timeout || null,
        journal_retention: journal_retention || null,
      },
    });
  };

  return (
    <>
      <ComplementaryFooter>
        <div className="flex flex-auto flex-col gap-2">
          {error && <ErrorBanner errors={[error]} />}
          <div className="flex gap-2">
            <ComplementaryClose>
              <Button
                className="w-1/2 flex-auto grow-0"
                variant="secondary"
                disabled={isPending || isSubmitting}
              >
                Close
              </Button>
            </ComplementaryClose>
            <SubmitButton
              form={formId}
              className="w-1/2 flex-auto grow-0"
              isPending={isPending}
            >
              Save
            </SubmitButton>
          </div>
        </div>
      </ComplementaryFooter>
      <Form
        className="flex flex-col [&_.section+.section]:mt-2"
        id={formId}
        method="patch"
        action={`/services/${String(service)}`}
        onSubmit={submitHandler}
        key={key}
      >
        <ServiceForm service={service} />
      </Form>
    </>
  );
}

function ServiceForm({
  service,
  isSubmitting,
}: {
  service: string;
  isSubmitting?: boolean;
}) {
  const { data: listDeploymentsData } = useListDeployments();
  const { data, isPending } = useServiceDetails(service);
  const handlers = data?.handlers ?? [];
  const { deployments, sortedRevisions = [] } =
    listDeploymentsData?.services.get(String(service)) ?? {};
  const isPendingOrSubmitting = isPending || isSubmitting;

  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={IconName.Box}
            className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
          {isPendingOrSubmitting ? (
            <>
              <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              <TruncateWithTooltip>
                {data?.name ?? 'Service'}
              </TruncateWithTooltip>
              {data && (
                <div className="flex w-full items-center gap-2">
                  <ServiceType type={data?.ty} className="" />
                  {data?.name && (
                    <ServicePlaygroundTrigger
                      service={data?.name}
                      className=""
                      variant="button"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </h2>
      <Section className="mt-4">
        <SectionTitle>Handlers</SectionTitle>
        <SectionContent className="px-2 pt-2" raised={false}>
          {isPendingOrSubmitting ? (
            <div className="h-6 w-full animate-pulse rounded-md bg-white" />
          ) : (
            <div className="flex flex-col gap-2">
              {handlers.map((handler) => (
                <Handler
                  handler={handler}
                  key={handler.name}
                  className="pl-0"
                  service={service}
                  withPlayground
                  serviceType={data?.ty}
                />
              ))}
              {handlers.length === 0 && (
                <div className="text-xs leading-4 text-gray-400">
                  No handler
                </div>
              )}
            </div>
          )}
        </SectionContent>
      </Section>
      <Section>
        <SectionTitle>Access</SectionTitle>
        <SectionContent className="py-1.5">
          <FormFieldCheckbox
            name="public"
            value="true"
            defaultChecked={data?.public}
            direction="right"
            className="[&_label]:self-center"
            disabled={isPendingOrSubmitting}
          >
            <span className="text-sm font-medium text-zinc-500">Public</span>
          </FormFieldCheckbox>
        </SectionContent>
        <span className="px-3 py-2 text-xs leading-4 text-gray-500">
          Public services are accessible through the ingress, while private
          services can only be accessed from another Restate service.
        </span>
      </Section>
      <CollapsibleSection>
        <CollapsibleSectionTitle>Retention</CollapsibleSectionTitle>
        <CollapsibleSectionContent
          className="flex flex-col gap-4"
          footer={
            <span className="mt-2 block px-4 pb-2 text-xs font-normal text-gray-500 normal-case">
              Configured using the{' '}
              <Link
                href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                jiff friendly
              </Link>{' '}
              format.
            </span>
          }
        >
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
                  Choose from the example options above, or enter a custom value
                  in the{' '}
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
                  Choose from the example options above, or enter a custom value
                  in the{' '}
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
        </CollapsibleSectionContent>
      </CollapsibleSection>
      <CollapsibleSection>
        <CollapsibleSectionTitle>Timeouts</CollapsibleSectionTitle>
        <CollapsibleSectionContent
          className="flex flex-col gap-4"
          footer={
            <span className="mt-2 block px-4 pb-2 text-xs font-normal text-gray-500 normal-case">
              Configured using the{' '}
              <Link
                href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                jiff friendly
              </Link>{' '}
              format.
            </span>
          }
        >
          <FormFieldCombobox
            pattern={HUMANTIME_PATTERN_INPUT}
            allowsCustomValue
            defaultValue={data?.inactivity_timeout ?? ''}
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
          >
            <ComboBoxSection
              title="Examples"
              description={
                <>
                  Choose from the example options above, or enter a custom value
                  in the{' '}
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
              <ComboBoxItem value="1m">1m</ComboBoxItem>
              <ComboBoxItem value="5m">5m</ComboBoxItem>
              <ComboBoxItem value="30m">30m</ComboBoxItem>
              <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
              <ComboBoxItem value="1day">1day</ComboBoxItem>
            </ComboBoxSection>
          </FormFieldCombobox>
          <FormFieldCombobox
            pattern={HUMANTIME_PATTERN_INPUT}
            allowsCustomValue
            disabled={isPendingOrSubmitting}
            className="[&_label]:text-zinc-500"
            defaultValue={data?.abort_timeout ?? ''}
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
          >
            <ComboBoxSection
              title="Examples"
              description={
                <>
                  Choose from the example options above, or enter a custom value
                  in the{' '}
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
              <ComboBoxItem value="1m">1m</ComboBoxItem>
              <ComboBoxItem value="5m">5m</ComboBoxItem>
              <ComboBoxItem value="30m">30m</ComboBoxItem>
              <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
              <ComboBoxItem value="1day">1day</ComboBoxItem>
            </ComboBoxSection>
          </FormFieldCombobox>
        </CollapsibleSectionContent>
      </CollapsibleSection>
      <Section>
        <SectionTitle>Deployments</SectionTitle>
        <SectionContent className="px-2 pt-2" raised={false}>
          {isPendingOrSubmitting ? (
            <div className="h-6 w-full animate-pulse rounded-md bg-white" />
          ) : (
            <div className="flex flex-col gap-2">
              {sortedRevisions.map((revision) =>
                deployments?.[revision]?.map((id) => (
                  <Deployment
                    deploymentId={id}
                    revision={revision}
                    key={id}
                    highlightSelection={false}
                  />
                )),
              )}
            </div>
          )}
        </SectionContent>
      </Section>
    </>
  );
}
