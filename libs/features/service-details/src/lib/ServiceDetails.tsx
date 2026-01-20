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
  Handler,
  HANDLER_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { RetentionSection } from './RetentionSection';
import { TimeoutSection } from './TimeoutSection';
import { IngressAccessSection } from './IngressAccessSection';
import { RetryPolicySection } from './RetryPolicy';
import { useRestateContext } from '@restate/features/restate-context';
import { AdvancedSection } from './Advanced';
import { useState } from 'react';
import { Metadata } from '@restate/features/options';
import { ServiceHeader } from './ServiceHeader';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { useSearchParams } from 'react-router';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';

function onCloseQueryParam(searchParams: URLSearchParams) {
  searchParams.delete(HANDLER_QUERY_PARAM);
  return searchParams;
}
export function ServiceDetails() {
  return (
    <ComplementaryWithSearchParam
      paramName={SERVICE_QUERY_PARAM}
      onCloseQueryParam={onCloseQueryParam}
    >
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

const serviceNameStyles = tv({
  base: 'min-w-0 flex-auto rounded-lg px-1 py-0 text-lg leading-8',
  variants: {
    hasHandler: {
      true: 'text-gray-500',
      false: 'text-gray-900',
    },
  },
});
const handlerNameStyles = tv({
  base: 'block min-w-0 truncate',
  variants: {
    hasHandler: {
      true: 'text-gray-900',
      false: 'text-gray-500',
    },
  },
});
function ServiceContent({ service }: { service: string }) {
  const { data: listDeploymentsData } = useListDeployments();
  const { data, isPending } = useServiceDetails(service);
  const handlers = data?.handlers ?? [];
  const { deployments, sortedRevisions = [] } =
    listDeploymentsData?.services.get(String(service)) ?? {};

  const { OnboardingGuide, baseUrl } = useRestateContext();
  const [maxDeployments, setMaxDeployments] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedHandler = searchParams.get(HANDLER_QUERY_PARAM);
  const hasHandler =
    Boolean(selectedHandler) &&
    handlers.some(({ name }) => name === selectedHandler);
  const handlerData = handlers.find(
    (handler) => handler.name === selectedHandler,
  );

  const resolvedData = {
    ...data,
    ...handlerData,
    abort_timeout: handlerData?.abort_timeout ?? data?.abort_timeout,
    inactivity_timeout:
      handlerData?.inactivity_timeout ?? data?.inactivity_timeout,
    journal_retention:
      handlerData?.journal_retention ?? data?.journal_retention,
    idempotency_retention:
      handlerData?.idempotency_retention ?? data?.idempotency_retention,
    enable_lazy_state:
      handlerData?.enable_lazy_state ?? data?.enable_lazy_state,
    public: handlerData?.public ?? data?.public,
    workflow_completion_retention: handlerData
      ? undefined
      : data?.workflow_completion_retention,
    retry_policy: {
      exponentiation_factor:
        handlerData?.retry_policy?.exponentiation_factor ??
        data?.retry_policy?.exponentiation_factor,
      initial_interval:
        handlerData?.retry_policy?.initial_interval ??
        data?.retry_policy?.initial_interval,
      max_attempts:
        handlerData?.retry_policy?.max_attempts ??
        data?.retry_policy?.max_attempts,
      max_interval:
        handlerData?.retry_policy?.max_interval ??
        data?.retry_policy?.max_interval,
      on_max_attempts:
        handlerData?.retry_policy?.on_max_attempts ??
        data?.retry_policy?.on_max_attempts,
    },
  };

  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          {hasHandler ? (
            <Icon
              name={IconName.Function}
              className="h-full w-full fill-blue-50 p-0.5 text-blue-400 drop-shadow-md"
            />
          ) : (
            <Icon
              name={IconName.Box}
              className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
            />
          )}
        </div>{' '}
        <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
          {isPending ? (
            <>
              <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              <div className="flex max-w-full items-center gap-1">
                <Link
                  className={serviceNameStyles({
                    hasHandler,
                  })}
                  variant="icon"
                  href={`?${HANDLER_QUERY_PARAM}`}
                >
                  <TruncateWithTooltip>{service}</TruncateWithTooltip>
                </Link>
                {hasHandler && (
                  <>
                    <span className="mr-0.5 ml-1 shrink-0 text-gray-500">
                      /
                    </span>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          variant="icon"
                          className="-ml-1 flex min-w-0 flex-auto grow-0 items-center justify-center gap-0.5 rounded-lg py-0.5 pr-1 pl-2 text-lg font-medium italic"
                        >
                          {hasHandler && (
                            <span
                              className={handlerNameStyles({
                                hasHandler,
                              })}
                            >
                              <TruncateWithTooltip>{`${selectedHandler}()`}</TruncateWithTooltip>
                            </span>
                          )}

                          <Icon
                            name={IconName.ChevronsUpDown}
                            className="h-5 w-5 shrink-0 text-gray-500"
                          />
                        </Button>
                      </DropdownTrigger>
                      <DropdownPopover>
                        <DropdownSection title="Handlers">
                          <DropdownMenu
                            selectedItems={
                              selectedHandler ? [selectedHandler] : []
                            }
                            selectable
                            onSelect={(value) => {
                              setSearchParams((old) => {
                                old.set(HANDLER_QUERY_PARAM, value);
                                return old;
                              });
                            }}
                          >
                            {handlers.map((handler) => (
                              <DropdownItem
                                key={handler.name}
                                value={handler.name}
                              >
                                <span className="italic">{handler.name}()</span>
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </DropdownSection>
                      </DropdownPopover>
                    </Dropdown>
                  </>
                )}
              </div>

              <ServiceHeader
                type={data?.ty}
                info={resolvedData?.info}
                service={service}
                handler={
                  hasHandler
                    ? selectedHandler
                    : handlers?.length === 1
                      ? handlers.at(0)?.name
                      : undefined
                }
              />
            </>
          )}
        </div>
      </h2>
      {OnboardingGuide && (
        <OnboardingGuide stage="open-playground" service={service} />
      )}

      <div className="flex flex-col gap-2">
        <Section className="mt-4">
          <SectionTitle>{hasHandler ? 'Definition' : 'Handlers'}</SectionTitle>
          <SectionContent className="px-2 pt-2" raised={false}>
            {isPending ? (
              <div className="h-6 w-full animate-pulse rounded-md bg-white" />
            ) : (
              <div className="flex flex-col gap-2">
                {handlers
                  .filter(({ name }) => !hasHandler || name === selectedHandler)
                  .map((handler) => (
                    <Handler
                      handler={handler}
                      key={handler.name}
                      className="pr-0 pl-0"
                      service={service}
                      withPlayground
                      serviceType={data?.ty}
                      showLink={!hasHandler}
                      showType={hasHandler}
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
          <SectionTitle>
            {hasHandler ? 'Latest Deployment' : 'Deployments'}
          </SectionTitle>
          <SectionContent className="px-2 pt-2" raised={false}>
            {isPending ? (
              <div className="h-6 w-full animate-pulse rounded-md bg-white" />
            ) : (
              <div className="flex flex-col gap-2">
                {sortedRevisions
                  .slice(0, maxDeployments)
                  .filter(
                    (revision) => !hasHandler || data?.revision === revision,
                  )
                  .map((revision) =>
                    deployments?.[revision]?.map((id) => (
                      <Deployment
                        deploymentId={id}
                        revision={revision}
                        key={id}
                        highlightSelection={false}
                        showGithubMetadata
                        showSdk
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
        {data?.ty && ['VirtualObject', 'Workflow'].includes(data?.ty) && (
          <Section>
            <SectionTitle>State</SectionTitle>
            <SectionContent className="relative px-0 py-0" raised={false}>
              <Link
                href={`${baseUrl}/state/${service}${searchParams.size ? `?${searchParams.toString()}` : ''}`}
                variant="secondary-button"
                className="flex h-7 w-full items-center justify-start rounded-[calc(0.75rem-0.125rem)] py-0 pr-1 pl-2.5 text-0.5xs font-medium text-gray-500"
              >
                <span>Inspect state</span>
                <Icon
                  name={IconName.ChevronRight}
                  className="ml-auto h-3.5 w-3.5"
                />
              </Link>
            </SectionContent>
          </Section>
        )}
        <Metadata metadata={resolvedData?.metadata} />
        <IngressAccessSection
          isPublic={resolvedData?.public}
          isPending={isPending}
          service={service}
          isReadonly={hasHandler}
        />
        <RetentionSection
          retention={{
            idempotencyRetention: resolvedData?.idempotency_retention,
            workflowCompletionRetention:
              resolvedData && 'workflow_completion_retention' in resolvedData
                ? resolvedData?.workflow_completion_retention
                : undefined,
            journalRetention: resolvedData?.journal_retention,
          }}
          isPending={isPending}
          service={service}
          isReadonly={hasHandler}
        />
        <TimeoutSection
          isPending={isPending}
          service={service}
          timeout={{
            inactivity: resolvedData?.inactivity_timeout,
            abort: resolvedData?.abort_timeout,
          }}
          revision={data?.revision}
          isReadonly={hasHandler}
        />
        <RetryPolicySection
          retryPolicy={{
            exponentiationFactor:
              resolvedData?.retry_policy?.exponentiation_factor,
            initialInterval: resolvedData?.retry_policy?.initial_interval,
            maxAttempts: resolvedData?.retry_policy?.max_attempts,
            maxInterval: resolvedData?.retry_policy?.max_interval,
            onMaxAttempts: resolvedData?.retry_policy?.on_max_attempts,
          }}
          isPending={isPending}
          service={service}
        />
        <AdvancedSection
          isLazyStateEnabled={resolvedData?.enable_lazy_state}
          isPending={isPending}
          service={service}
        />
      </div>
    </>
  );
}
