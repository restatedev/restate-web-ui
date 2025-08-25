import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  useParamValue,
  ComplementaryFooter,
} from '@restate/ui/layout';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import {
  useListDeployments,
  useModifyService,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { Form } from 'react-router';
import { Icon, IconName } from '@restate/ui/icons';
import { FormFieldCheckbox } from '@restate/ui/form-field';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { FormEvent, useEffect, useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBanner } from '@restate/ui/error';
import { showSuccessNotification } from '@restate/ui/notification';
import { Deployment } from '@restate/features/deployment';
import {
  ServiceType,
  ServicePlaygroundTrigger,
  Handler,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { RetentionSection } from './RetentionSection';
import { TimeoutSection } from './TimeoutSection';

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
      <RetentionSection
        serviceDetails={data}
        isPending={isPendingOrSubmitting}
      />
      <TimeoutSection serviceDetails={data} isPending={isPendingOrSubmitting} />
    </>
  );
}
