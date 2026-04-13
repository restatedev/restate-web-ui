import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import {
  DeploymentId,
  Revision as ServiceRevision,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api-spec';
import { Revision } from './Revision';
import { DEPLOYMENT_QUERY_PARAM } from './constants';
import { Link } from '@restate/ui/link';
import { useRef } from 'react';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { MiniGithubMetadata } from '@restate/features/options';
import { MiniSDK } from './SDK';

const styles = tv({
  base: 'relative flex flex-row items-center border text-0.5xs transition-all ease-in-out',
  variants: {
    isSelected: {
      true: 'z-10 rounded-lg border bg-white font-medium shadow-xs shadow-zinc-800/3',
      false: 'border-transparent',
    },
    variant: {
      secondary: '-m-1 gap-0.5 p-1',
      primary:
        '-mx-1 my-0 min-h-[2.625rem] gap-2 rounded-lg px-1 py-0.5 hover:bg-black/3',
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

const iconContainerStyles = tv({
  base: 'shrink-0 border bg-white shadow-xs',
  variants: {
    variant: {
      secondary: 'mr-1.5 h-6 w-6 rounded-md',
      primary: 'h-7 w-7 rounded-lg',
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

const iconStyles = tv({
  base: 'h-full w-full p-1',
  variants: {
    variant: {
      secondary: 'text-zinc-400',
      primary: 'fill-blue-50 text-blue-400 drop-shadow-md',
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

const bodyStyles = tv({
  base: 'min-w-[6ch] flex-auto text-zinc-600',
  variants: {
    variant: {
      secondary: 'mr-2',
      primary: 'mr-0',
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

const endpointStyles = tv({
  base: 'min-w-0 flex-auto basis-full',
  variants: {
    variant: {
      secondary: '',
      primary: 'text-base font-medium text-zinc-700',
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

export const MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION = 5;

export function Deployment({
  className,
  revision,
  deploymentId,
  highlightSelection = true,
  showEndpoint = true,
  showLink = true,
  showGithubMetadata = false,
  showSdk = false,
  variant = 'secondary',
}: {
  revision?: ServiceRevision;
  className?: string;
  deploymentId?: DeploymentId;
  highlightSelection?: boolean;
  showEndpoint?: boolean;
  showLink?: boolean;
  showGithubMetadata?: boolean;
  showSdk?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const { tunnel, isVersionGte } = useRestateContext();
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

  const isDeprecated = Boolean(
    deployment &&
      deployment.max_protocol_version <
        MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION &&
      isVersionGte?.('1.6.0'),
  );

  if (!deployment) {
    if (deploymentId) {
      return (
        <div className={styles({ className, isSelected, variant })}>
          <div className={bodyStyles({ variant })}>
            <div className={endpointStyles({ variant })}>
              <TruncateWithTooltip
                copyText={deploymentId}
                triggerRef={linkRef}
                className="[&_.badge]:bg-gray-700"
              >
                {deploymentId}
              </TruncateWithTooltip>
            </div>
          </div>
          {showLink && (
            <Link
              ref={linkRef}
              aria-label={deploymentId}
              variant="secondary"
              href={`?${DEPLOYMENT_QUERY_PARAM}=${deploymentId}`}
              className="m-1 ml-0 rounded-full outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
            >
              <Icon
                name={IconName.ChevronRight}
                className="h-4 w-4 text-gray-400"
              />
            </Link>
          )}
        </div>
      );
    }
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
    <div
      className={styles({ className, isSelected, variant })}
      data-deprecated={isDeprecated}
    >
      {isDeprecated ? (
        <Popover>
          <PopoverTrigger>
            <Button
              className="z-[2] mr-1.5 rounded-md border-orange-200 bg-orange-50 p-1"
              variant="secondary"
            >
              <Icon
                name={IconName.TriangleAlert}
                className="h-3.5 w-3.5 text-orange-500"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-w-md">
            <div className="p-4 text-0.5xs text-orange-600">
              <span className="font-semibold">Unsupported SDK Version:</span>{' '}
              This deployment uses an obsolete SDK version (Service Protocol{' '}
              {deployment.max_protocol_version}) that is no longer supported.
              Please upgrade…
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className={iconContainerStyles({ variant })}>
          <Icon
            name={
              isTunnel
                ? IconName.Tunnel
                : isHttpDeployment(deployment)
                  ? IconName.Http
                  : IconName.Lambda
            }
            className={iconStyles({ variant })}
          />
        </div>
      )}

      <div className={bodyStyles({ variant })}>
        <div className="flex max-w-full min-w-0 items-center gap-1.5">
          {isTunnel && (
            <HoverTooltip
              content={
                <p className="flex items-center">
                  Tunnel name:{' '}
                  <code className="ml-1 inline-block">
                    {tunnelEndpoint?.name}
                  </code>
                  <Copy
                    copyText={String(tunnelEndpoint?.name)}
                    className="ml-4 h-5 w-5 rounded-xs bg-zinc-800/90 p-1 hover:bg-zinc-600 pressed:bg-zinc-500"
                  />
                </p>
              }
            >
              <Badge
                size="xs"
                className="relative z-[2] max-w-fit shrink-0 translate-y-px cursor-default rounded-sm py-0.5 font-mono text-2xs leading-3 font-medium"
              >
                <Icon name={IconName.AtSign} className="mr-0.5 h-3 w-3" />
                <div className="max-w-[20ch] truncate">
                  {tunnelEndpoint?.name}
                </div>
              </Badge>
            </HoverTooltip>
          )}
          <div className={endpointStyles({ variant })}>
            <TruncateWithTooltip
              copyText={deploymentEndpoint}
              triggerRef={linkRef}
              className="[&_.badge]:bg-gray-700"
            >
              {showEndpoint ? deploymentEndpoint : deploymentId}
            </TruncateWithTooltip>
          </div>
        </div>
      </div>

      {showSdk && (
        <MiniSDK
          sdkVersion={deployment.sdk_version}
          className="z-[2] text-gray-500"
        />
      )}
      {showGithubMetadata && (
        <MiniGithubMetadata metadata={deployment.metadata} className="z-[2]" />
      )}
      {revision && <Revision revision={revision} className="z-2 ml-auto" />}
      {showLink && (
        <Link
          ref={linkRef}
          aria-label={deploymentEndpoint}
          variant="secondary"
          href={`?${DEPLOYMENT_QUERY_PARAM}=${deployment.id}`}
          className="m-1 ml-0 rounded-full outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="h-4 w-4 text-gray-400"
          />
        </Link>
      )}
    </div>
  );
}
