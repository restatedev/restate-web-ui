import type { DetailedDeployment } from '@restate/data-access/admin-api-spec';
import {
  isHttpDeployment,
  isLambdaDeployment,
} from '@restate/data-access/admin-api-spec';
import {
  GithubMetadata,
  getCustomMetadataEntries,
  hasGithubMetadata,
} from '@restate/features/options';
import { UPDATE_DEPLOYMENT_QUERY } from '@restate/features/register-deployment';
import {
  CardEditAction,
  DeploymentProtocolRows,
  DeploymentSdkRow,
  RegisteredCaption,
  useIsDeprecatedDeployment,
} from '@restate/features/service-route';
import { Badge } from '@restate/ui/badge';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';

const valueStyles = tv({
  base: 'text-xs text-zinc-600 tabular-nums',
});

const skeletonStyles = tv({
  base: 'inline-block h-4 w-32 animate-pulse rounded-full bg-gray-200/70',
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

function Skeleton() {
  return <span className={skeletonStyles()} />;
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

export function DetailsCard({
  deployment,
  registeredAt,
}: {
  deployment?: DetailedDeployment;
  registeredAt?: string;
}) {
  const isDeprecated = useIsDeprecatedDeployment(deployment);

  return (
    <Card intent={isDeprecated ? 'warning' : 'none'}>
      <CardHeader title="Details" icon={IconName.Info}>
        <RegisteredCaption date={registeredAt} />
      </CardHeader>
      {deployment ? (
        <DeploymentSdkRow deployment={deployment} />
      ) : (
        <CardRow>
          <Skeleton />
        </CardRow>
      )}
      <DeploymentProtocolRows deployment={deployment} />
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
