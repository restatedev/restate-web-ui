import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  DeploymentId,
  Revision as ServiceRevision,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api';
import { Revision } from './Revision';
import { DEPLOYMENT_QUERY_PARAM } from './constants';
import { Link } from '@restate/ui/link';
import { useRef } from 'react';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';

const styles = tv({
  base: 'relative -m-1 flex flex-row items-center gap-2 border p-1 text-0.5xs transition-all ease-in-out',
  variants: {
    isSelected: {
      true: 'z-10 -mx-1 rounded-lg border bg-white px-1 font-medium shadow-xs shadow-zinc-800/3',
      false: 'border-transparent',
    },
  },
});

export function Deployment({
  className,
  revision,
  deploymentId,
  highlightSelection = true,
  showEndpoint = true,
}: {
  revision?: ServiceRevision;
  className?: string;
  deploymentId?: DeploymentId;
  highlightSelection?: boolean;
  showEndpoint?: boolean;
}) {
  const { tunnel } = useRestateContext();
  const { data: { deployments } = {} } = useListDeployments({
    refetchOnMount: false,
  });
  const deployment = deploymentId ? deployments?.get(deploymentId) : undefined;
  const activeDeploymentInSidebar = useActiveSidebarParam(
    DEPLOYMENT_QUERY_PARAM,
  );

  const isSelected =
    activeDeploymentInSidebar === deploymentId && highlightSelection;
  const linkRef = useRef<HTMLAnchorElement>(null);

  if (!deployment) {
    return null;
  }

  const isTunnel = Boolean(
    tunnel?.isEnabled &&
      isHttpDeployment(deployment) &&
      tunnel.fromHttp(deployment.uri),
  );
  const endpoint = getEndpoint(deployment);
  const tunnelEndpoint = isTunnel ? tunnel?.fromHttp(endpoint) : undefined;

  const deploymentEndpoint = isTunnel ? tunnelEndpoint?.remoteUrl : endpoint;

  return (
    <div className={styles({ className, isSelected })}>
      <div className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs">
        <Icon
          name={
            isTunnel
              ? IconName.Tunnel
              : isHttpDeployment(deployment)
                ? IconName.Http
                : IconName.Lambda
          }
          className="h-full w-full p-1 text-zinc-400"
        />
      </div>

      <div className="flex min-w-[6ch] flex-auto flex-row items-center gap-1 text-zinc-600">
        {
          <div className="flex max-w-full min-w-0 items-center gap-1.5 [&>*]:max-w-fit [&>*]:flex-auto [&>*:not(.deployment)]:min-w-[0ch] [&>*:not(.deployment)]:basis-[40ch]">
            {isTunnel && (
              <HoverTooltip
                content={
                  <p>
                    Tunnel name:{' '}
                    <code className="inline">{tunnelEndpoint?.name}</code>
                  </p>
                }
              >
                <Badge
                  size="xs"
                  className="relative z-[2] max-w-full flex-auto shrink-0 cursor-default rounded-sm py-0.5 font-mono text-2xs leading-3 font-medium"
                >
                  <div className="w-full truncate">{tunnelEndpoint?.name}</div>
                </Badge>
              </HoverTooltip>
            )}
            <div className="deployment min-w-0 flex-auto basis-full">
              <TruncateWithTooltip
                copyText={deploymentEndpoint}
                triggerRef={linkRef}
                className="[&_.badge]:bg-gray-700"
              >
                {showEndpoint ? deploymentEndpoint : deploymentId}
              </TruncateWithTooltip>
            </div>
          </div>
        }
        <Link
          ref={linkRef}
          aria-label={deploymentEndpoint}
          variant="secondary"
          href={`?${DEPLOYMENT_QUERY_PARAM}=${deployment.id}`}
          className="m-1 ml-0 rounded-full outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="h-4 w-4 text-gray-500"
          />
        </Link>
      </div>
      {revision && <Revision revision={revision} className="z-2 ml-auto" />}
    </div>
  );
}
