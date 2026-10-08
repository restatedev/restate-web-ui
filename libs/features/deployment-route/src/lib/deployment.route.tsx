import {
  useDeploymentDetails,
  useListDeployments,
  useListDrainedDeployments,
} from '@restate/data-access/admin-api-hooks';
import {
  DeploymentStatusBadge,
  MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION,
  resolveDeploymentEndpoint,
} from '@restate/features/deployment';
import { DeploymentActions } from '@restate/features/register-deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Breadcrumbs } from '@restate/ui/breadcrumbs';
import { CardGrid } from '@restate/ui/card';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui/chip';
import { Copy } from '@restate/ui/copy';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Header } from '@restate/ui/header';
import { Icon, IconName } from '@restate/ui/icons';
import {
  HoverTooltip,
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { useParams, useSearchParams } from 'react-router';
import {
  DetailsCard,
  HeadersCard,
  MetadataCard,
  hasHeadersCardContent,
  hasMetadataCardContent,
} from './DeploymentCards';
import {
  DeploymentDetails,
  deploymentTabFromSearch,
} from './DeploymentDetails';

function EndpointChip({
  endpoint,
  tunnelName,
  isPending,
}: {
  endpoint?: string;
  tunnelName?: string;
  isPending: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-[0_1_auto] items-center gap-2">
      {tunnelName && (
        <HoverTooltip
          content={
            <p className="flex items-center">
              Tunnel name:{' '}
              <code className="ml-1 inline-block">{tunnelName}</code>
              <Copy
                copyText={tunnelName}
                className="ml-4 h-5 w-5 rounded-xs bg-zinc-800/90 p-1 hover:bg-zinc-600 pressed:bg-zinc-500"
              />
            </p>
          }
          className="min-w-0 shrink-0"
        >
          <Badge
            size="sm"
            className="max-w-40 cursor-default gap-0.5 font-mono"
          >
            <Icon name={IconName.AtSign} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tunnelName}</span>
          </Badge>
        </HoverTooltip>
      )}
      <TruncateWithTooltip
        copyText={endpoint}
        containerClassName="min-w-0 flex-auto"
        overflowVisible
      >
        <ChipGroup variant="header" className="w-full">
          <Chip
            size="lg"
            className="max-w-full text-xs font-medium text-zinc-600"
            containerClassName="w-full [&>[data-chip-root]]:w-full"
          >
            <ChipSegment className="min-w-0 bg-white pr-1 pl-2 font-mono text-[90%] text-zinc-600">
              {isPending ? (
                <span className="inline-block h-3.5 w-48 animate-pulse rounded bg-zinc-200" />
              ) : (
                <>
                  <TruncateTooltipTrigger>{endpoint}</TruncateTooltipTrigger>
                  {endpoint && (
                    <Copy
                      copyText={endpoint}
                      className="ml-0.5 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
                    />
                  )}
                </>
              )}
            </ChipSegment>
          </Chip>
        </ChipGroup>
      </TruncateWithTooltip>
    </div>
  );
}

function Component() {
  const { deployment: deploymentId = '' } = useParams<{
    deployment: string;
  }>();
  const [searchParams] = useSearchParams();
  const tab = deploymentTabFromSearch(searchParams);
  const { tunnel, isVersionGte } = useRestateContext();
  const { data, error, isPending, dataUpdatedAt } = useDeploymentDetails(
    deploymentId,
    {
      enabled: Boolean(deploymentId),
      refetchOnMount: true,
      staleTime: 0,
    },
  );
  const { data: deploymentsData, dataUpdatedAt: deploymentsUpdatedAt } =
    useListDeployments();
  const { data: drainedDeploymentIds } = useListDrainedDeployments();
  const listedDeployment = deploymentsData?.deployments.get(deploymentId);
  const services = data?.services ?? [];
  const isDrained = drainedDeploymentIds
    ? drainedDeploymentIds.has(deploymentId)
    : undefined;
  const isUpdateSupported = isVersionGte?.('1.6.0');
  const isDeprecated = Boolean(
    data &&
    data.max_protocol_version < MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION &&
    isVersionGte?.('1.6.0'),
  );
  const {
    endpoint: displayedEndpoint,
    tunnelName,
    icon,
  } = resolveDeploymentEndpoint(data, tunnel);

  return (
    <SnapshotTimeProvider
      lastSnapshot={Math.max(dataUpdatedAt, deploymentsUpdatedAt)}
    >
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <Header
          icon={icon}
          iconLabel="Deployment"
          variant={isDeprecated ? 'warning' : 'default'}
          className="min-w-0"
          trail={<Breadcrumbs variant="flat" />}
        >
          <EndpointChip
            endpoint={displayedEndpoint}
            tunnelName={tunnelName}
            isPending={isPending}
          />
          {isDrained !== undefined && (
            <DeploymentStatusBadge
              status={isDrained ? 'drained' : 'active'}
              className="shrink-0"
            />
          )}
          {data && (
            <div className="ml-auto flex shrink-0 items-center">
              <DeploymentActions
                deploymentId={deploymentId}
                isUpdateSupported={isUpdateSupported}
                variant="header"
              />
            </div>
          )}
        </Header>
        {error && !data ? (
          <div className="px-5 py-20">
            <EmptyState
              icon={IconName.TriangleAlert}
              intent="danger"
              title="Couldn’t load this deployment"
            >
              <ErrorBanner
                error={error}
                className="w-full rounded-xl text-left"
              />
            </EmptyState>
          </div>
        ) : (
          <>
            <CardGrid columns={3} className="relative z-40 mx-5 mt-3">
              <DetailsCard
                deployment={data}
                registeredAt={listedDeployment?.created_at}
              />
              {data && hasHeadersCardContent(data) && (
                <HeadersCard
                  deployment={data}
                  isUpdateSupported={isUpdateSupported}
                />
              )}
              {data && hasMetadataCardContent(data) && (
                <MetadataCard deployment={data} />
              )}
            </CardGrid>
            <DeploymentDetails
              deploymentId={deploymentId}
              services={services}
              tab={tab}
              isPending={isPending}
              error={error}
            />
          </>
        )}
      </div>
    </SnapshotTimeProvider>
  );
}

export const deploymentRoute = { Component };
