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
  Deployment,
  getEndpoint,
  isHttpDeployment,
  isLambdaDeployment,
  getProtocolType,
} from '@restate/data-access/admin-api';
import { InlineTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
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
  const services = data?.services ?? [];
  const additionalHeaders = Object.entries(data?.additional_headers ?? {});
  return (
    <>
      <h2 className="mb-3 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={
              data
                ? isHttpDeployment(data)
                  ? IconName.Http
                  : IconName.Lambda
                : IconName.Http
            }
            className="h-full w-full fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex min-w-0 flex-col items-start gap-1">
          {isPending ? (
            <>
              <div className="mt-1 h-5 w-[16ch] animate-pulse rounded-md bg-gray-200" />
              <div className="h-5 w-[8ch] animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              Deployment
              <span className="contents font-mono text-sm text-gray-500">
                <TruncateWithTooltip>{getEndpoint(data)}</TruncateWithTooltip>
              </span>
            </>
          )}
        </div>
      </h2>
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
        <SectionTitle className="mt-2">SDK</SectionTitle>
        <SectionContent className="p-0">
          <div className="flex items-center px-1.5 py-1 not-last:border-b">
            <SDK
              lastAttemptServer={data?.sdk_version ?? undefined}
              className="gap-1 text-xs font-medium text-zinc-600"
            />
          </div>
        </SectionContent>
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
      {data && (
        <Section className="mt-4">
          <SectionTitle>Id</SectionTitle>
          <SectionContent className="flex items-center py-1 pr-0.5 font-mono text-0.5xs text-zinc-600">
            <div>{data?.id}</div>
            {data?.id && (
              <Copy
                copyText={data?.id}
                className="shrink-0 p-1 text-2xs [&_svg]:h-3 [&_svg]:w-3"
              />
            )}
          </SectionContent>
        </Section>
      )}
    </>
  );
}

function Header({ name, value }: { name: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-center gap-1 truncate bg-white px-2 py-0 text-0.5xs text-zinc-600 not-last:border-b first:rounded-t-[calc(0.75rem-0.125rem)] last:rounded-b-[calc(0.75rem-0.125rem)]">
      <div className="relative flex min-w-0 items-start border-r py-1 pr-1">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="flex min-w-0 py-1 pl-1">
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      </div>
    </div>
  );
}
