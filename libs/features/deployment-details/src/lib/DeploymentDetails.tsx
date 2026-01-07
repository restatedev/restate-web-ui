import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryFooter,
  useParamValue,
} from '@restate/ui/layout';
import { useSearchParams } from 'react-router';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Icon, IconName } from '@restate/ui/icons';
import {
  getEndpoint,
  isHttpDeployment,
  isLambdaDeployment,
  getProtocolType,
} from '@restate/data-access/admin-api';
import {
  DateTooltip,
  HoverTooltip,
  InlineTooltip,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import {
  ProtocolTypeExplainer,
  ServiceCompatibility,
} from '@restate/features/explainers';
import { ErrorBanner } from '@restate/ui/error';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';
import { useDeploymentDetails } from '@restate/data-access/admin-api-hooks';
import { MiniService } from '@restate/features/service';
import {
  DEPLOYMENT_QUERY_PARAM,
  DELETE_DEPLOYMENT_QUERY_PARAM,
  SDK,
} from '@restate/features/deployment';
import { useRestateContext } from '@restate/features/restate-context';
import { formatDateTime } from '@restate/util/intl';
import { ReactNode } from 'react';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';

export function DeploymentDetails() {
  return (
    <ComplementaryWithSearchParam paramName={DEPLOYMENT_QUERY_PARAM}>
      <DeploymentDetailsContents />
    </ComplementaryWithSearchParam>
  );
}

function DeploymentDetailsContents() {
  const [, setSearchParams] = useSearchParams();
  const deployment = useParamValue();
  const { error } = useDeploymentDetails(String(deployment), {
    ...(!deployment && { enabled: false }),
  });

  if (!deployment) {
    return null;
  }

  return (
    <>
      <ComplementaryFooter>
        <div className="flex flex-auto flex-col gap-2">
          {error && <ErrorBanner errors={[error]} />}
          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="w-1/2 flex-auto grow-0" variant="secondary">
                Close
              </Button>
            </ComplementaryClose>
            <Button
              className="w-1/2 flex-auto grow-0"
              variant="destructive"
              onClick={() =>
                setSearchParams(
                  (old) => {
                    old.set(DELETE_DEPLOYMENT_QUERY_PARAM, deployment);
                    return old;
                  },
                  { preventScrollReset: true },
                )
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </ComplementaryFooter>
      <DeploymentContent deployment={deployment} />
    </>
  );
}

function DeploymentContent({ deployment }: { deployment: string }) {
  const { data, isPending } = useDeploymentDetails(deployment);
  const { tunnel } = useRestateContext();

  const services = data?.services ?? [];
  const additionalHeaders = Object.entries(data?.additional_headers ?? {});
  const metadata = Object.entries(data?.metadata ?? {});
  const metadataExcludingGithub = metadata.filter(
    ([name]) =>
      ![...COMMIT_KEYS, ...ACTION_RUN_ID_KEYS, ...REPO_KEYS].includes(name),
  );

  const isTunnel = Boolean(
    tunnel?.isEnabled &&
      data &&
      isHttpDeployment(data) &&
      tunnel.fromHttp(data.uri),
  );
  const endpoint = getEndpoint(data);
  const tunnelEndpoint = isTunnel ? tunnel?.fromHttp(endpoint) : undefined;

  const displayedEndpoint = isTunnel ? tunnelEndpoint?.remoteUrl : endpoint;

  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={
              data
                ? isTunnel
                  ? IconName.Tunnel
                  : isHttpDeployment(data)
                    ? IconName.Http
                    : IconName.Lambda
                : IconName.Http
            }
            className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
          {isPending ? (
            <>
              <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              Deployment
              <span className="flex w-full items-center gap-1.5 text-sm text-gray-500 [&>*]:max-w-fit [&>*]:min-w-0 [&>*]:grow [&>*:last-child]:basis-full">
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
                    className="min-w-0 basis-[12ch]"
                  >
                    <Badge
                      size="sm"
                      className="relative z-[2] max-w-full flex-auto shrink-0 translate-y-px cursor-default rounded-sm py-0.5 font-mono"
                    >
                      <Icon
                        name={IconName.AtSign}
                        className="mr-0.5 h-3.5 w-3.5"
                      />

                      <div className="w-full truncate">
                        {tunnelEndpoint?.name}
                      </div>
                    </Badge>
                  </HoverTooltip>
                )}
                <TruncateWithTooltip>{displayedEndpoint}</TruncateWithTooltip>
              </span>
            </>
          )}
        </div>
      </h2>
      {data && (
        <Section className="mt-4">
          <SectionTitle>Deployment details</SectionTitle>
          <SectionContent className="p-0">
            <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
              <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
                Id
              </span>
              <Badge
                size="sm"
                className="ml-10 min-w-0 py-0 pr-0 align-middle font-mono"
              >
                <div className="truncate">{data.id}</div>
                <Copy
                  copyText={data?.id}
                  className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
                />
              </Badge>
            </div>

            <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
              <span className="flex-auto shrink-0 pl-1 text-0.5xs font-medium text-gray-500">
                Create at
              </span>
              <Badge
                size="sm"
                className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono"
              >
                <DateTooltip
                  date={new Date(data.created_at)}
                  title="Created at"
                >
                  {formatDateTime(new Date(data.created_at), 'system')}
                </DateTooltip>
              </Badge>
            </div>
          </SectionContent>
        </Section>
      )}
      <Section className="mt-5">
        <SectionTitle>Services</SectionTitle>
        <SectionContent className="px-2 pt-2" raised={false}>
          {isPending ? (
            <div className="flex flex-col gap-2">
              <div className="h-6 w-full animate-pulse rounded-md bg-white" />
              <div className="h-6 w-full animate-pulse rounded-md bg-white" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {services.map((service) => (
                <MiniService service={service} key={service.name} />
              ))}
            </div>
          )}
        </SectionContent>
      </Section>
      {additionalHeaders.length > 0 && (
        <Section className="mt-4">
          <SectionTitle>Additional headers</SectionTitle>
          <SectionContent className="p-0" raised={false}>
            <>
              <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
                <div className="pl-2">Name</div>
                <div className="pl-2">Value</div>
              </div>
              {isPending ? (
                <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border-transparent">
                  <div className="h-6 w-full animate-pulse rounded-t-[calc(0.75rem-0.125rem)] border-b bg-white" />
                  <div className="h-6 w-full animate-pulse rounded-b-[calc(0.75rem-0.125rem)] bg-white delay-200" />
                </div>
              ) : (
                <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
                  {additionalHeaders.map(([name, value]) => (
                    <Header name={name} value={value} key={name} />
                  ))}
                </div>
              )}
            </>
          </SectionContent>
          <span className="px-3 py-2 text-xs leading-4 text-gray-500">
            Headers added to the register/invoke requests to the deployment.
          </span>
        </Section>
      )}
      {metadata.length > 0 && (
        <Section className="mt-4">
          <SectionTitle>Metadata</SectionTitle>
          <SectionContent className="p-0">
            <DeploymentGithubMetadata metadata={data?.metadata} />
          </SectionContent>
          {metadataExcludingGithub.length > 0 && (
            <SectionContent className="p-0" raised={false}>
              <div className="mt-2 grid grid-cols-[1fr_2fr] text-xs font-medium text-gray-400">
                <div className="pl-2">Key</div>
                <div className="pl-2">Value</div>
              </div>

              <div className="flex flex-col rounded-[calc(0.75rem-0.125rem)] border shadow-xs">
                {metadataExcludingGithub.map(([name, value]) => (
                  <Header name={name} value={value} key={name} />
                ))}
              </div>
            </SectionContent>
          )}
          <span className="px-3 py-2 text-xs leading-4 text-gray-500">
            Metadata attached at the time of registration.
          </span>
        </Section>
      )}
      <Section className="mt-4">
        <SectionTitle>
          <ProtocolTypeExplainer variant="indicator-button">
            Protocol
          </ProtocolTypeExplainer>
        </SectionTitle>
        <SectionContent className="p-0">
          <div className="flex items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Type
            </span>
            <Badge size="sm" className="py-0 align-middle font-mono">
              {getProtocolType(data)}
            </Badge>
          </div>
          {data && isHttpDeployment(data) && (
            <div className="flex items-center px-1.5 py-1 not-last:border-b">
              <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
                <code>HTTP</code> version
              </span>
              <Badge size="sm" className="py-0 align-middle font-mono">
                {data.http_version}
              </Badge>
            </div>
          )}
        </SectionContent>
        <SectionTitle className="mt-2">
          <ServiceCompatibility variant="indicator-button">
            Service compatibility
          </ServiceCompatibility>
        </SectionTitle>
        <SectionContent className="p-0">
          <div className="flex items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Min protocol version
            </span>
            <Badge size="sm" className="py-0 align-middle font-mono">
              {data?.min_protocol_version}
            </Badge>
          </div>
          <div className="flex items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Max protocol version
            </span>
            <Badge size="sm" className="py-0 align-middle font-mono">
              {data?.max_protocol_version}
            </Badge>
          </div>
        </SectionContent>
        {data?.sdk_version && (
          <>
            <SectionTitle className="mt-2">SDK</SectionTitle>
            <SectionContent className="p-0">
              <div className="flex items-center px-1.5 py-1 not-last:border-b">
                <SDK
                  lastAttemptServer={data?.sdk_version ?? undefined}
                  className="gap-1 text-xs font-medium text-zinc-600"
                />
              </div>
            </SectionContent>
          </>
        )}
        {data && isLambdaDeployment(data) && data.assume_role_arn && (
          <>
            <SectionTitle className="mt-2">
              <InlineTooltip
                title="Assume role ARN"
                description="ARN of a role to use when invoking the Lambda"
                variant="indicator-button"
              >
                Assume role ARN
              </InlineTooltip>
            </SectionTitle>
            <SectionContent className="px-2 py-1 text-0.5xs font-medium text-gray-500">
              <TruncateWithTooltip copyText={data.assume_role_arn}>
                {data.assume_role_arn}
              </TruncateWithTooltip>
            </SectionContent>
          </>
        )}
      </Section>
    </>
  );
}

function ListItem({ name, value }: { name: ReactNode; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex min-w-0 items-start border-r py-1 pr-1">
        {name}
      </div>
      <div className="flex min-w-0 py-1 pl-1">{value}</div>
    </div>
  );
}

function Header({ name, value }: { name: string; value: string }) {
  return (
    <ListItem
      name={<TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>}
      value={
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      }
    />
  );
}

const COMMIT_KEYS = [
  'github.commit.sha',
  'github_commit_sha',
  'github.sha',
  'github_sha',
];
const REPO_KEYS = ['github.repository', 'github_repository'];
const ACTION_RUN_ID_KEYS = [
  'github.actions.run.id',
  'github_actions_run_id',
  'github_run_id',
  'github.run.id',
];

const githubStyles = tv({
  base: 'flex items-center px-1.5 py-1 text-0.5xs font-medium text-gray-500',
});
export function DeploymentGithubMetadata({
  metadata,
  className,
}: {
  metadata?: Record<string, string>;
  className?: string;
}) {
  const commitSha = COMMIT_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const repository = REPO_KEYS.reduce<string | undefined>((acc, key) => {
    return acc || metadata?.[key];
  }, undefined);
  const actionsRunId = ACTION_RUN_ID_KEYS.reduce<string | undefined>(
    (acc, key) => {
      return acc || metadata?.[key];
    },
    undefined,
  );

  if (!repository) {
    return null;
  }

  const baseUrl = `https://github.com/${repository}`;
  const commitUrl = commitSha ? `${baseUrl}/commit/${commitSha}` : undefined;
  const actionUrl = actionsRunId
    ? `${baseUrl}/actions/runs/${actionsRunId}`
    : undefined;

  return (
    <div className={githubStyles({ className })}>
      <span className="flex flex-auto items-center pl-1">
        <Icon name={IconName.Github} className="mr-2 h-4 w-4" />
        Github
      </span>
      <div className="flex gap-2">
        {commitUrl && (
          <HoverTooltip content="View commit">
            <Link
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="icon"
              className="bg-blue-50 text-blue-600"
            >
              <Icon name={IconName.GitGraph} className="h-4 w-4" />
            </Link>
          </HoverTooltip>
        )}
        {actionUrl && (
          <HoverTooltip content="View GitHub Action run">
            <Link
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="icon"
              className="bg-blue-50 text-blue-600"
            >
              <Icon name={IconName.CirclePlay} className="h-4 w-4" />
            </Link>
          </HoverTooltip>
        )}
      </div>
    </div>
  );
}
