import { Invocation, useListDeployments } from '@restate/data-access/admin-api';
import { Deployment, SDK } from '@restate/features/overview-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'text-xs  flex flex-col items-start',
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
      ({ name }) => name === invocation.target_service_name
    )?.revision;

    return revision ? (
      <div className={styles({ className })}>
        <div className="flex px-1.5 py-1 h-9 items-center not-last:border-b w-full">
          <Deployment
            deploymentId={deploymentId}
            revision={revision}
            className="text-inherit p-0 pr-0.5 m-0 [&_a:before]:rounded-md max-w-full w-full"
            highlightSelection={false}
          />
        </div>
        {showSdk &&
          (invocation.last_attempt_server || deployment.sdk_version) && (
            <div className="flex px-1.5 py-1 h-9 items-center not-last:border-b w-full">
              <SDK
                lastAttemptServer={
                  invocation.last_attempt_server ??
                  deployment.sdk_version ??
                  undefined
                }
                className="text-[85%] font-medium text-zinc-600 gap-2 max-w-[calc(100%-1.75rem)] -mt-0.5"
              />
            </div>
          )}
      </div>
    ) : (
      <div className="font-mono text-zinc-600  gap-1.5 text-xs truncate">
        <div className="py-0.5 min-w-0 truncate font-sans text-xs text-zinc-500 flex items-center gap-[0.5ch]">
          <div className="min-w-[5ch] basis-[5ch] flex-auto">
            <TruncateWithTooltip copyText={deploymentId}>
              {deploymentId}
            </TruncateWithTooltip>
          </div>
          <div className="truncate flex-auto">no longer exists.</div>
        </div>
      </div>
    );
  }
  return null;
}
