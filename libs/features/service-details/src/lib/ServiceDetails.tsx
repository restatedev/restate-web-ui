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
import { useRestateContext } from '@restate/features/restate-context';
import { AdvancedSection } from './Advanced';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { DropdownSection } from '@restate/ui/dropdown';
import { formatPlurals } from '@restate/util/intl';

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

  const { OnboardingGuide } = useRestateContext();
  const [maxDeployments, setMaxDeployments] = useState(10);

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
                      {...(data?.handlers?.length === 1 && {
                        handler: data.handlers.at(0)?.name,
                      })}
                    />
                  )}
                  {data.info && data.info.length > 0 && (
                    <Popover>
                      <PopoverTrigger>
                        <Button
                          className="flex min-w-0 items-center gap-1 rounded-md border-orange-200 bg-orange-50 px-1 py-0.5 text-xs font-normal text-orange-600"
                          variant="secondary"
                        >
                          <Icon
                            name={IconName.TriangleAlert}
                            className="h-3.5 w-3.5 shrink-0 text-orange-500"
                          />
                          {formatPlurals(data.info.length, {
                            one: 'warning',
                            other: 'warnings',
                          })}

                          <div className="ml-1 truncate rounded-full bg-orange-500 px-1.5 text-2xs font-normal text-white">
                            {data.info.length}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-md">
                        <DropdownSection
                          title={formatPlurals(data.info.length, {
                            one: 'warning',
                            other: 'warnings',
                          })}
                        >
                          {data?.info?.map((info) => (
                            <p
                              className="-m-px flex gap-2 border border-orange-200 bg-orange-50 p-3 text-0.5xs text-orange-600 first:rounded-t-xl last:rounded-b-xl"
                              key={info.code}
                            >
                              <Icon
                                className="h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
                                name={IconName.TriangleAlert}
                              />
                              <span className="inline-block">
                                <span className="font-semibold">Warning: </span>
                                {info.message}
                              </span>
                            </p>
                          ))}
                        </DropdownSection>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </h2>
      {OnboardingGuide && (
        <OnboardingGuide stage="open-playground" service={service} />
      )}

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
                {sortedRevisions
                  .slice(0, maxDeployments)
                  .map((revision) =>
                    deployments?.[revision]?.map((id) => (
                      <Deployment
                        deploymentId={id}
                        revision={revision}
                        key={id}
                        highlightSelection={false}
                        showGithubMetadata
                      />
                    )),
                  )}
                {sortedRevisions.length > maxDeployments && (
                  <Button
                    variant="icon"
                    className="cursor-pointer rounded-lg border-none bg-transparent px-8 py-1 text-left text-0.5xs text-gray-500 no-underline shadow-none hover:bg-black/3 pressed:bg-black/5"
                    onClick={() => {
                      setMaxDeployments(
                        (maxDeployments) => maxDeployments + 10,
                      );
                    }}
                  >
                    +{sortedRevisions.length - maxDeployments} deployment
                    {sortedRevisions.length - maxDeployments > 1 ? 's' : ''}…
                  </Button>
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
        <AdvancedSection serviceDetails={data} isPending={isPending} />
      </div>
    </>
  );
}
