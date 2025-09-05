import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  useParamValue,
  ComplementaryFooter,
} from '@restate/ui/layout';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import {
  useListDeployments,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBanner } from '@restate/ui/error';
import { Deployment } from '@restate/features/deployment';
import {
  ServiceType,
  ServicePlaygroundTrigger,
  Handler,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { RetentionSection } from './RetentionSection';
import { TimeoutSection } from './TimeoutSection';
import { IngressAccessSection } from './IngressAccessSection';
import { RetryPolicySection } from './RetryPolicy';
import { RestateMinimumVersion } from '@restate/util/feature-flag';

export function ServiceDetails() {
  return (
    <ComplementaryWithSearchParam paramName={SERVICE_QUERY_PARAM}>
      <ServiceDetailsContent />
    </ComplementaryWithSearchParam>
  );
}

function ServiceDetailsContent() {
  const service = useParamValue();
  const { data, queryKey, error, isPending, refetch } = useServiceDetails(
    String(service),
    {
      ...(!service && { enabled: false }),
    },
  );

  const queryClient = useQueryClient();

  if (!service) {
    return null;
  }

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
                disabled={isPending}
              >
                Close
              </Button>
            </ComplementaryClose>
            <Button
              className="w-1/2 flex-auto grow-0"
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </ComplementaryFooter>

      <ServiceContent service={service} />
    </>
  );
}

function ServiceContent({ service }: { service: string }) {
  const { data: listDeploymentsData } = useListDeployments();
  const { data, isPending } = useServiceDetails(service);
  const handlers = data?.handlers ?? [];
  const { deployments, sortedRevisions = [] } =
    listDeploymentsData?.services.get(String(service)) ?? {};

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
          {isPending ? (
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
      <div className="flex flex-col gap-2">
        <Section className="mt-4">
          <SectionTitle>Handlers</SectionTitle>
          <SectionContent className="px-2 pt-2" raised={false}>
            {isPending ? (
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
            {isPending ? (
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
        <IngressAccessSection serviceDetails={data} isPending={isPending} />
        <RetentionSection serviceDetails={data} isPending={isPending} />
        <TimeoutSection serviceDetails={data} isPending={isPending} />
        <RestateMinimumVersion minVersion="1.4.5">
          <RetryPolicySection serviceDetails={data} isPending={isPending} />
        </RestateMinimumVersion>
      </div>
    </>
  );
}
