import type { Invocation } from '@restate/data-access/admin-api';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Deployment, SDK } from '@restate/features/overview-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'flex flex-col items-start text-xs',
});

export function InvocationDeployment({
  invocation,
  className,
  showSdk = false,
}: {
  invocation: Invocation;
  className?: string;
  showSdk?: boolean;
}) {
  const { data } = useListDeployments();
  const deploymentId =
    invocation.last_attempt_deployment_id ?? invocation.pinned_deployment_id;
  if (deploymentId) {
    const deployment = data?.deployments.get(deploymentId);
    const revision = deployment?.services.find(
      ({ name }) => name === invocation.target_service_name,
    )?.revision;

    return revision ? (
      <div className={styles({ className })}>
        <div className="flex h-9 w-full items-center px-1.5 py-1 not-last:border-b">
          <Deployment
            deploymentId={deploymentId}
            revision={revision}
            className="m-0 w-full max-w-full p-0 pr-0.5 text-inherit [&_a:before]:rounded-md"
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
                className="-mt-0.5 max-w-[calc(100%-1.75rem)] gap-2 text-[85%] font-medium text-zinc-600"
              />
            </div>
          )}
      </div>
    ) : (
      <div className="gap-1.5 truncate font-mono text-xs text-zinc-600">
        <div className="flex min-w-0 items-center gap-[0.5ch] truncate py-0.5 font-sans text-xs text-zinc-500">
          <div className="min-w-[5ch] flex-auto basis-[5ch]">
            <TruncateWithTooltip copyText={deploymentId}>
              {deploymentId}
            </TruncateWithTooltip>
          </div>
          <div className="flex-auto truncate">no longer exists.</div>
        </div>
      </div>
    );
  }
  return null;
}
