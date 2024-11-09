import { Button, SubmitButton } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
} from '@restate/ui/layout';
import { SERVICE_QUERY_PARAM } from '../constants';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import {
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api';
import { Form, useSearchParams } from '@remix-run/react';
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
import { InlineTooltip } from '@restate/ui/tooltip';
import { HUMANTIME_PATTERN_INPUT } from '@restate/humantime';
import { useId } from 'react';
import { Link } from '@restate/ui/link';

export function ServiceDetails() {
  const formId = useId();
  return (
    <ComplementaryWithSearchParam
      paramName={SERVICE_QUERY_PARAM}
      footer={
        <>
          <ComplementaryClose>
            <Button className="flex-auto" variant="secondary">
              Cancel
            </Button>
          </ComplementaryClose>
          <SubmitButton form={formId} className="flex-auto">
            Save
          </SubmitButton>
        </>
      }
    >
      <ServiceForm id={formId} />
    </ComplementaryWithSearchParam>
  );
}

function ServiceForm({ id }: { id: string }) {
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_QUERY_PARAM);
  const { data: listDeploymentsData } = useListDeployments();
  const { data } = useServiceDetails(service ?? '', {
    enabled: Boolean(service),
  });
  const handlers = data?.handlers ?? [];
  const { deployments, sortedRevisions = [] } =
    listDeploymentsData?.services.get(String(service)) ?? {};

  if (!data) {
    return null;
  }

  return (
    <Form className="flex [&_section+section]:mt-2 flex-col" id={id}>
      <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 flex gap-2 items-center">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={IconName.Box}
            className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex flex-col items-start gap-1">
          {data?.name}
          <ServiceType type={data?.ty} className="self-start" />
        </div>
      </h2>
      <Section className="mt-4">
        <SectionTitle>Handlers</SectionTitle>
        <SectionContent className="bg-transparent shadow-none border-none">
          <div className="flex flex-col gap-2">
            {handlers.map((handler) => (
              <Handler handler={handler} key={handler.name} className="pl-0" />
            ))}
          </div>
        </SectionContent>
      </Section>
      <Section>
        <SectionTitle>Access</SectionTitle>
        <SectionContent data-className="bg-transparent shadow-none border-none">
          <FormFieldCheckbox
            name="public"
            value="true"
            defaultChecked={data.public}
            direction="right"
            className="[&_input]:self-center"
          >
            <span className="text-zinc-500 font-medium text-sm">Public</span>
          </FormFieldCheckbox>
        </SectionContent>
        <span className="px-3 py-2 text-xs text-gray-500 leading-1">
          Public services are accessible through the ingress, while private
          services can only be accessed from another Restate service.
        </span>
      </Section>
      <Section>
        <SectionTitle>Retention</SectionTitle>
        <SectionContent className="flex flex-col gap-4">
          <FormFieldCombobox
            pattern={HUMANTIME_PATTERN_INPUT}
            allowsCustomValue
            required
            defaultValue={data?.idempotency_retention}
            label={
              <InlineTooltip
                variant="indicator-button"
                title="Idempotency completion"
                description="Modify the retention of idempotent requests for this service."
              >
                <span slot="title">Idempotency completion</span>
              </InlineTooltip>
            }
            name="idempotency_retention"
            className="[&_label]:text-zinc-500"
          >
            <ComboBoxSection
              title="Examples"
              description={
                <>
                  Choose from the example options above, or enter a custom value
                  in the{' '}
                  <Link
                    href="https://docs.rs/humantime/latest/humantime/fn.parse_duration.html#examples"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    humantime
                  </Link>{' '}
                  format.
                </>
              }
            >
              <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
              <ComboBoxItem value="12h">12h</ComboBoxItem>
              <ComboBoxItem value="1day">1day</ComboBoxItem>
              <ComboBoxItem value="7days">7days</ComboBoxItem>
              <ComboBoxItem value="1month">1month</ComboBoxItem>
            </ComboBoxSection>
          </FormFieldCombobox>
          {data?.ty === 'Workflow' && (
            <FormFieldCombobox
              pattern={HUMANTIME_PATTERN_INPUT}
              allowsCustomValue
              required
              className="[&_label]:text-zinc-500"
              defaultValue={data?.workflow_completion_retention ?? undefined}
              label={
                <InlineTooltip
                  variant="indicator-button"
                  title="Workflow completion"
                  description="Modify the retention of the workflow completion. This
                          can be modified only for workflow services"
                >
                  <span slot="title">Workflow completion</span>
                </InlineTooltip>
              }
              name="workflow_completion_retention"
            >
              <ComboBoxSection title="Examples">
                <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
                <ComboBoxItem value="12h">12h</ComboBoxItem>
                <ComboBoxItem value="1day">1day</ComboBoxItem>
                <ComboBoxItem value="7days">7days</ComboBoxItem>
                <ComboBoxItem value="1month">1month</ComboBoxItem>
              </ComboBoxSection>
            </FormFieldCombobox>
          )}
        </SectionContent>
        <span className="text-gray-500 px-4 pb-2 block text-xs normal-case font-normal mt-2">
          Configured using the{' '}
          <Link
            href="https://docs.rs/humantime/latest/humantime/fn.parse_duration.html#examples"
            target="_blank"
            rel="noopener noreferrer"
          >
            humantime
          </Link>{' '}
          format.
        </span>
      </Section>
      <Section>
        <SectionTitle>Deployments</SectionTitle>
        <SectionContent className="bg-transparent shadow-none border-none">
          <div className="flex flex-col gap-2">
            {sortedRevisions.map((revision) => (
              <Deployment
                deploymentId={deployments?.[revision]}
                revision={revision}
                key={revision}
              />
            ))}
          </div>
        </SectionContent>
      </Section>
    </Form>
  );
}
