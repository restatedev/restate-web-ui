import type {
  DetailedDeployment,
  Deployment,
} from '@restate/data-access/admin-api-spec';
import {
  getProtocolType,
  isHttpDeployment,
  isLambdaDeployment,
} from '@restate/data-access/admin-api-spec';
import {
  MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION,
  SDK,
  getSDKVersion,
} from '@restate/features/deployment';
import {
  GithubMetadata,
  getCustomMetadataEntries,
  hasGithubMetadata,
} from '@restate/features/options';
import { UPDATE_DEPLOYMENT_QUERY } from '@restate/features/register-deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { CardEditAction } from '@restate/features/service-route';
import { Badge } from '@restate/ui/badge';
import {
  Card,
  CardHeader,
  CardHeroValue,
  CardLinkRow,
  CardRow,
} from '@restate/ui/card';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import { RelativeDate } from '@restate/ui/tooltip';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';

const valueStyles = tv({
  base: 'text-xs text-zinc-600 tabular-nums',
});

const skeletonStyles = tv({
  base: 'inline-block animate-pulse rounded-full bg-gray-200/70',
  variants: {
    variant: {
      hero: 'h-6 w-20',
      default: 'h-4 w-14',
    },
  },
  defaultVariants: { variant: 'default' },
});

const captionStyles = tv({
  base: 'flex min-w-0 items-center gap-1 text-2xs font-medium text-gray-400',
  variants: {
    tone: {
      default: '',
      warning: 'text-orange-700',
    },
  },
  defaultVariants: { tone: 'default' },
});

function Skeleton({ variant }: { variant?: 'hero' | 'default' }) {
  return <span className={skeletonStyles({ variant })} />;
}

function HeroText({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-auto">
      <div className="text-0.5xs font-medium text-gray-500">{title}</div>
      {description && (
        <div className="mt-0.5 truncate text-2xs text-gray-400">
          {description}
        </div>
      )}
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  return (
    <Badge size="sm" className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono">
      <span className="truncate">{value}</span>
      <Copy
        copyText={value}
        className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
      />
    </Badge>
  );
}

function MonoLabel({ children }: { children: ReactNode }) {
  return <span className="font-mono">{children}</span>;
}

export type DeploymentLifecycle = 'latest' | 'superseded' | 'drained';

export function getDeploymentLifecycle({
  isDrained,
  latestFor,
}: {
  isDrained: boolean;
  latestFor: number;
}): DeploymentLifecycle {
  if (isDrained) {
    return 'drained';
  }
  return latestFor > 0 ? 'latest' : 'superseded';
}

function lifecycleDescription({
  lifecycle,
  latestFor,
  total,
}: {
  lifecycle: DeploymentLifecycle;
  latestFor: number;
  total: number;
}) {
  switch (lifecycle) {
    case 'drained':
      return 'Drained, nothing depends on it';
    case 'superseded':
      return 'Superseded by newer revisions';
    case 'latest':
      return latestFor === total
        ? 'Latest revision of every service'
        : `Latest revision of ${formatNumber(latestFor)} of ${formatNumber(total)}`;
  }
}

export function LifecycleCard({
  deployment,
  isDrained,
  latestFor,
  total,
  isPending,
  servicesHref,
  invocationsHref,
}: {
  deployment?: Deployment;
  isDrained?: boolean;
  latestFor: number;
  total: number;
  isPending: boolean;
  servicesHref: string;
  invocationsHref: string;
}) {
  const lifecycle =
    isDrained === undefined
      ? undefined
      : getDeploymentLifecycle({ isDrained, latestFor });
  const isReady = Boolean(lifecycle) && !isPending;

  return (
    <Card intent="none">
      <CardHeader title="Lifecycle" icon={IconName.GitGraph}>
        {deployment && (
          <span className={captionStyles()}>
            Registered
            <RelativeDate
              date={deployment.created_at}
              title="Registered at"
              className="text-2xs font-medium text-gray-500"
            />
          </span>
        )}
      </CardHeader>
      <CardLinkRow
        variant="hero"
        href={servicesHref}
        aria-label="View the services of this deployment"
        label={
          <HeroText
            title="Services"
            description={
              isReady && lifecycle
                ? lifecycleDescription({ lifecycle, latestFor, total })
                : undefined
            }
          />
        }
      >
        {isReady ? (
          <CardHeroValue>{formatNumber(total)}</CardHeroValue>
        ) : (
          <Skeleton variant="hero" />
        )}
      </CardLinkRow>
      <CardLinkRow
        href={invocationsHref}
        aria-label="View the invocations pinned to this deployment"
      >
        <span className="text-xs font-medium text-zinc-600">
          Pinned invocations
        </span>
      </CardLinkRow>
    </Card>
  );
}

function ServerInfoRows({ info }: { info?: DetailedDeployment['info'] }) {
  if (!info || info.length === 0) {
    return null;
  }
  return (
    <>
      {info.map((item, index) => (
        <CardRow key={`${item.code ?? ''}-${index}`} className="py-2">
          <span
            className={captionStyles({
              tone: 'warning',
              className: 'items-start',
            })}
          >
            <Icon
              name={IconName.TriangleAlert}
              className="mt-px h-3 w-3 shrink-0"
            />
            <span className="min-w-0 font-normal">
              {item.code && <MonoLabel>{item.code}: </MonoLabel>}
              {item.message}
            </span>
          </span>
        </CardRow>
      ))}
    </>
  );
}

export function ProtocolCard({
  deployment,
  isPending,
}: {
  deployment?: DetailedDeployment;
  isPending: boolean;
}) {
  const { isVersionGte } = useRestateContext();
  const isDeprecated = Boolean(
    deployment &&
    deployment.max_protocol_version < MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION &&
    isVersionGte?.('1.6.0'),
  );
  const { sdk } = getSDKVersion(deployment?.sdk_version ?? undefined);
  const protocolType = deployment ? getProtocolType(deployment) : undefined;

  return (
    <Card intent={isDeprecated ? 'warning' : 'none'}>
      <CardHeader title="Protocol" icon={IconName.Code}>
        {isDeprecated && (
          <span className={captionStyles({ tone: 'warning' })}>
            <Icon name={IconName.TriangleAlert} className="h-3 w-3" />
            Outdated SDK
          </span>
        )}
      </CardHeader>
      <CardRow variant="hero">
        <HeroText
          title={isPending || sdk ? 'SDK' : 'Type'}
          description={
            isPending
              ? undefined
              : sdk
                ? 'At discovery'
                : 'No SDK version reported'
          }
        />
        {isPending || !deployment ? (
          <Skeleton variant="hero" />
        ) : sdk ? (
          <SDK
            lastAttemptServer={deployment.sdk_version ?? undefined}
            className="gap-2 text-sm font-medium text-zinc-700"
          />
        ) : (
          <CardHeroValue>{protocolType}</CardHeroValue>
        )}
      </CardRow>
      {(isPending || sdk) && (
        <CardRow label="Type">
          {deployment ? (
            <span className={valueStyles()}>{protocolType}</span>
          ) : (
            <Skeleton />
          )}
        </CardRow>
      )}
      {deployment && isHttpDeployment(deployment) && (
        <CardRow label="HTTP version">
          <span className={valueStyles()}>{deployment.http_version}</span>
        </CardRow>
      )}
      <CardRow label="Service protocol">
        {deployment ? (
          <span className={valueStyles()}>
            v{deployment.min_protocol_version}
            {deployment.max_protocol_version !==
              deployment.min_protocol_version &&
              ` – v${deployment.max_protocol_version}`}
          </span>
        ) : (
          <Skeleton />
        )}
      </CardRow>
      {deployment && isLambdaDeployment(deployment) && (
        <>
          {deployment.assume_role_arn && (
            <CardRow label="Assume role">
              <CopyValue value={deployment.assume_role_arn} />
            </CardRow>
          )}
          {deployment.compression && (
            <CardRow label="Compression">
              <span className={valueStyles()}>{deployment.compression}</span>
            </CardRow>
          )}
        </>
      )}
      <ServerInfoRows info={deployment?.info} />
    </Card>
  );
}

export function hasHeadersCardContent(deployment?: DetailedDeployment) {
  if (!deployment) {
    return false;
  }
  return (
    Object.keys(deployment.additional_headers ?? {}).length > 0 ||
    Boolean(isHttpDeployment(deployment) && deployment.auth?.GoogleIdToken)
  );
}

export function HeadersCard({
  deployment,
  isUpdateSupported,
}: {
  deployment: DetailedDeployment;
  isUpdateSupported?: boolean;
}) {
  const headers = Object.entries(deployment.additional_headers ?? {});
  const auth = isHttpDeployment(deployment)
    ? deployment.auth?.GoogleIdToken
    : undefined;

  return (
    <Card intent="none">
      <CardHeader
        title="Headers"
        icon={IconName.TableProperties}
        action={
          isUpdateSupported && (
            <CardEditAction
              param={UPDATE_DEPLOYMENT_QUERY}
              value={deployment.id}
              label="Update"
            />
          )
        }
      >
        <span className={captionStyles()}>
          {formatNumber(headers.length)}{' '}
          {formatPlurals(headers.length, { one: 'header', other: 'headers' })}
        </span>
      </CardHeader>
      {headers.map(([name, value]) => (
        <CardRow key={name} label={<MonoLabel>{name}</MonoLabel>}>
          <CopyValue value={value} />
        </CardRow>
      ))}
      {auth && (
        <>
          <CardRow label="Authentication">
            <span className={valueStyles()}>Google ID token</span>
          </CardRow>
          {auth.audience && (
            <CardRow label="Audience">
              <CopyValue value={auth.audience} />
            </CardRow>
          )}
          {auth.impersonate_service_account && (
            <CardRow label="Impersonate">
              <CopyValue value={auth.impersonate_service_account} />
            </CardRow>
          )}
        </>
      )}
    </Card>
  );
}

export function hasMetadataCardContent(deployment?: DetailedDeployment) {
  return Boolean(
    deployment &&
    (hasGithubMetadata(deployment.metadata) ||
      getCustomMetadataEntries(deployment.metadata).length > 0),
  );
}

export function MetadataCard({
  deployment,
}: {
  deployment: DetailedDeployment;
}) {
  const entries = getCustomMetadataEntries(deployment.metadata);
  return (
    <Card intent="none">
      <CardHeader title="Metadata" icon={IconName.Info} />
      {hasGithubMetadata(deployment.metadata) && (
        <CardRow>
          <GithubMetadata
            metadata={deployment.metadata}
            className="w-full pl-0.5"
          />
        </CardRow>
      )}
      {entries.map(([name, value]) => (
        <CardRow key={name} label={<MonoLabel>{name}</MonoLabel>}>
          <CopyValue value={value} />
        </CardRow>
      ))}
    </Card>
  );
}
