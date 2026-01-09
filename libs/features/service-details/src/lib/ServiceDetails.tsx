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

const serviceNameStyles = tv({
  base: 'min-w-0 flex-auto',
  variants: {
    hasHandler: {
      true: 'text-gray-500',
      false: 'text-gray-900',
    },
  },
});
const handlerNameStyles = tv({
  base: 'block min-w-0 truncate font-mono',
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

  const { OnboardingGuide } = useRestateContext();
  const [maxDeployments, setMaxDeployments] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedHandler = searchParams.get(HANDLER_QUERY_PARAM);

  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={IconName.Box}
            className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex min-w-0 flex-auto flex-col items-start gap-2">
          {isPending ? (
            <>
              <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              <div className="flex max-w-full items-center gap-1">
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="icon"
                      className="text-md -ml-1 flex min-w-0 flex-auto grow-0 items-center justify-center gap-0.5 rounded-lg py-0.5 pr-1 pl-2 italic"
                    >
                      <span
                        className={serviceNameStyles({
                          hasHandler: Boolean(selectedHandler),
                        })}
                      >
                        <TruncateWithTooltip>{service}</TruncateWithTooltip>
                      </span>
                      {Boolean(selectedHandler) && (
                        <>
                          <span className="mx-0.5 shrink-0 text-gray-500">
                            /
                          </span>
                          <span
                            className={handlerNameStyles({
                              hasHandler: Boolean(selectedHandler),
                            })}
                          >
                            {`${selectedHandler}()`}
                          </span>
                        </>
                      )}

                      <Icon
                        name={IconName.ChevronsUpDown}
                        className="h-5 w-5 shrink-0 text-gray-500"
                      />
                    </Button>
                  </DropdownTrigger>
                  <DropdownPopover>
                    <DropdownSection title="Service">
                      <DropdownMenu
                        selectedItems={selectedHandler ? [] : ['service']}
                        selectable
                        onSelect={(value) => {
                          setSearchParams((old) => {
                            old.delete(HANDLER_QUERY_PARAM);
                            return old;
                          });
                        }}
                      >
                        <DropdownItem value="service">
                          <span className="font-medium">{service}</span>
                        </DropdownItem>
                      </DropdownMenu>
                    </DropdownSection>
                    <DropdownSection title="Handlers">
                      <DropdownMenu
                        selectedItems={selectedHandler ? [selectedHandler] : []}
                        selectable
                        onSelect={(value) => {
                          setSearchParams((old) => {
                            old.set(HANDLER_QUERY_PARAM, value);
                            return old;
                          });
                        }}
                      >
                        {handlers.map((handler) => (
                          <DropdownItem key={handler.name} value={handler.name}>
                            <span className="font-mono text-0.5xs font-medium italic">
                              {handler.name}()
                            </span>
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </DropdownSection>
                  </DropdownPopover>
                </Dropdown>
              </div>

              <ServiceHeader
                type={data?.ty}
                info={data?.info}
                service={service}
                handler={
                  data?.handlers?.length === 1
                    ? data.handlers.at(0)?.name
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
        <Metadata metadata={data?.metadata} />
        <IngressAccessSection
          isPublic={data?.public}
          isPending={isPending}
          service={service}
        />
        <RetentionSection
          retention={{
            idempotencyRetention: data?.idempotency_retention,
            workflowCompletionRetention: data?.workflow_completion_retention,
            journalRetention: data?.journal_retention,
          }}
          isPending={isPending}
          service={service}
        />
        <TimeoutSection
          isPending={isPending}
          service={service}
          timeout={{
            inactivity: data?.inactivity_timeout,
            abort: data?.abort_timeout,
          }}
          revision={data?.revision}
        />
        <RetryPolicySection
          retryPolicy={{
            exponentiationFactor: data?.retry_policy?.exponentiation_factor,
            initialInterval: data?.retry_policy?.initial_interval,
            maxAttempts: data?.retry_policy?.max_attempts,
            maxInterval: data?.retry_policy?.max_interval,
            onMaxAttempts: data?.retry_policy?.on_max_attempts,
          }}
          isPending={isPending}
          service={service}
        />
        <AdvancedSection
          isLazyStateEnabled={data?.enable_lazy_state}
          isPending={isPending}
          service={service}
        />
      </div>
    </>
  );
}
