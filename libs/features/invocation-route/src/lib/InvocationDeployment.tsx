import type { Invocation } from '@restate/data-access/admin-api-spec';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Deployment, SDK } from '@restate/features/deployment';
import { GithubMetadata, hasGithubMetadata } from '@restate/features/options';
import { Badge } from '@restate/ui/badge';
import { CardRow } from '@restate/ui/card';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'flex flex-col items-start text-xs',
});

function DeploymentId({ deploymentId }: { deploymentId: string }) {
  return (
    <Badge
      size="sm"
      className="ml-1 max-w-48 min-w-0 py-0 pr-0 align-middle font-mono"
    >
      <TruncateWithTooltip
        tooltipContent={deploymentId}
        copyText={deploymentId}
        hideCopy
      >
        <span className="block truncate">{deploymentId}</span>
      </TruncateWithTooltip>
      <Copy
        copyText={deploymentId}
        className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
      />
    </Badge>
  );
}

function MissingDeployment({
  deploymentId,
  variant,
}: {
  deploymentId: string;
  variant: 'section' | 'card';
}) {
  if (variant === 'card') {
    return (
      <CardRow variant="hero" className="flex-wrap gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Icon name={IconName.TriangleAlert} className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600">
              Deployment not found
            </div>
            <div className="text-2xs text-zinc-400">
              It may have been removed.
            </div>
          </div>
        </div>
        <span className="min-w-2 flex-auto" />
        <DeploymentId deploymentId={deploymentId} />
      </CardRow>
    );
  }

  return (
    <div className="flex h-9 w-full min-w-0 items-center px-1.5 py-1">
      <span className="flex-auto shrink-0 pl-1 text-0.5xs font-medium text-gray-500">
        Deployment not found
      </span>
      <DeploymentId deploymentId={deploymentId} />
    </div>
  );
}

export function InvocationDeploymentCell({
  invocation,
  className,
}: {
  invocation: Invocation;
  className?: string;
}) {
  const { data } = useListDeployments();
  const deploymentId =
    invocation.last_attempt_deployment_id ?? invocation.pinned_deployment_id;
  if (deploymentId) {
    const deployment = data?.deployments.get(deploymentId);
    const revision = deployment?.services.find(
      ({ name }) => name === invocation.target_service_name,
    )?.revision;
    return (
      <Deployment
        deploymentId={deploymentId}
        revision={revision}
        className={[
          'm-0 w-full max-w-full p-0 pr-0.5 font-normal text-inherit [&_a:before]:rounded-md',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        highlightSelection={false}
      />
    );
  }

  return null;
}

export function InvocationDeployment({
  invocation,
  className,
  showSdk = false,
  showGithub = false,
  variant = 'section',
}: {
  invocation: Invocation;
  className?: string;
  showSdk?: boolean;
  showGithub?: boolean;
  variant?: 'section' | 'card';
}) {
  const { data } = useListDeployments();
  const deploymentId =
    invocation.last_attempt_deployment_id ?? invocation.pinned_deployment_id;
  if (deploymentId) {
    const deployment = data?.deployments.get(deploymentId);
    const revision = deployment?.services.find(
      ({ name }) => name === invocation.target_service_name,
    )?.revision;

    if (revision && variant === 'card') {
      return (
        <>
          <CardRow variant="hero" className="items-stretch">
            <Deployment
              deploymentId={deploymentId}
              revision={revision}
              className="m-0 w-full max-w-full p-0 pr-0.5 font-normal text-inherit [&_a:before]:rounded-md"
              highlightSelection={false}
            />
          </CardRow>
          {showSdk &&
            (invocation.last_attempt_server || deployment.sdk_version) && (
              <CardRow>
                <SDK
                  lastAttemptServer={
                    invocation.last_attempt_server ??
                    deployment.sdk_version ??
                    undefined
                  }
                  className="-mt-0.5 max-w-[calc(100%-1.75rem)] gap-2 text-xs font-medium text-zinc-600"
                />
              </CardRow>
            )}
          {hasGithubMetadata(deployment.metadata) && showGithub && (
            <CardRow>
              <GithubMetadata
                metadata={deployment.metadata}
                className="w-full pl-0.5"
              />
            </CardRow>
          )}
        </>
      );
    }

    if (!revision && variant === 'card') {
      return <MissingDeployment deploymentId={deploymentId} variant="card" />;
    }

    return revision ? (
      <div className={styles({ className })}>
        <div className="flex h-9 w-full items-center px-1.5 py-1 not-last:border-b">
          <Deployment
            deploymentId={deploymentId}
            revision={revision}
            className="m-0 w-full max-w-full p-0 pr-0.5 font-normal text-inherit [&_a:before]:rounded-md"
            highlightSelection={false}
          />
        </div>
        {showSdk &&
          (invocation.last_attempt_server || deployment.sdk_version) && (
            <div className="flex h-9 w-full items-center px-1.5 py-1 not-last:border-b">
              <SDK
                lastAttemptServer={
                  invocation.last_attempt_server ??
                  deployment.sdk_version ??
                  undefined
                }
                className="-mt-0.5 max-w-[calc(100%-1.75rem)] gap-2 text-xs font-medium text-zinc-600"
              />
            </div>
          )}
        {hasGithubMetadata(deployment.metadata) && showGithub && (
          <div className="flex h-9 w-full items-center px-1.5 py-1 not-last:border-b">
            <GithubMetadata
              metadata={deployment.metadata}
              className="w-full pl-0.5"
            />
          </div>
        )}
      </div>
    ) : (
      <MissingDeployment deploymentId={deploymentId} variant="section" />
    );
  }
  return null;
}
