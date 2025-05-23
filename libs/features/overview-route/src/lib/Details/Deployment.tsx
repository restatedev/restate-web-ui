import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
  ComplementaryFooter,
  useParamValue,
} from '@restate/ui/layout';
import {
  DELETE_DEPLOYMENT_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
} from '../constants';
import { useSearchParams } from 'react-router';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Deployment,
  useDeploymentDetails,
  getEndpoint,
  isHttpDeployment,
  isLambdaDeployment,
} from '@restate/data-access/admin-api';
import { InlineTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { MiniService } from '../MiniService';
import {
  ProtocolTypeExplainer,
  ServiceCompatibility,
} from '@restate/features/explainers';
import { ErrorBanner } from '@restate/ui/error';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';
import { SDK } from './SDK';

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
        <div className="flex gap-2 flex-col flex-auto">
          {error && <ErrorBanner errors={[error]} />}
          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="flex-auto grow-0 w-1/2" variant="secondary">
                Close
              </Button>
            </ComplementaryClose>
            <Button
              className="flex-auto grow-0 w-1/2"
              variant="destructive"
              onClick={() =>
                setSearchParams(
                  (old) => {
                    old.set(DELETE_DEPLOYMENT_QUERY_PARAM, deployment);
                    return old;
                  },
                  { preventScrollReset: true }
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
      <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 flex gap-2 items-center">
        <div className="h-10 w-10 shrink-0 text-blue-400">
          <Icon
            name={
              data
                ? isHttpDeployment(data)
                  ? IconName.Http
                  : IconName.Lambda
                : IconName.Http
            }
            className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
          />
        </div>{' '}
        <div className="flex flex-col items-start gap-1 min-w-0">
          {isPending ? (
            <>
              <div className="w-[16ch] h-5 animate-pulse rounded-md bg-gray-200 mt-1" />
              <div className="w-[8ch] h-5 animate-pulse rounded-md bg-gray-200" />
            </>
          ) : (
            <>
              Deployment
              <span className="text-sm text-gray-500 contents font-mono">
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
              <div className="w-full h-6 animate-pulse rounded-md bg-white" />
              <div className="w-full h-6 animate-pulse rounded-md bg-white" />
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
              <div className="mt-2 grid [grid-template-columns:1fr_2fr] text-xs font-medium text-gray-400">
                <div className="pl-2">Name</div>
                <div className="pl-2">Value</div>
              </div>
              {isPending ? (
                <div className="flex flex-col border-transparent rounded-[calc(0.75rem-0.125rem)]">
                  <div className="w-full h-6 animate-pulse border-b rounded-t-[calc(0.75rem-0.125rem)] bg-white" />
                  <div className="w-full h-6 animate-pulse delay-200 rounded-b-[calc(0.75rem-0.125rem)] bg-white" />
                </div>
              ) : (
                <div className="flex flex-col shadow-sm border rounded-[calc(0.75rem-0.125rem)]">
                  {additionalHeaders.map(([name, value]) => (
                    <Header name={name} value={value} key={name} />
                  ))}
                </div>
              )}
            </>
          </SectionContent>
          <span className="px-3 py-2 text-xs text-gray-500 leading-1">
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
          <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Type
            </span>
            <Badge size="sm" className="font-mono py-0  align-middle">
              {getProtocolType(data)}
            </Badge>
          </div>
          {data && isHttpDeployment(data) && (
            <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
              <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
                <code>HTTP</code> version
              </span>
              <Badge size="sm" className="font-mono py-0  align-middle">
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
          <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Min protocol version
            </span>
            <Badge size="sm" className="font-mono py-0  align-middle">
              {data?.min_protocol_version}
            </Badge>
          </div>
          <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Max protocol version
            </span>
            <Badge size="sm" className="font-mono py-0  align-middle">
              {data?.max_protocol_version}
            </Badge>
          </div>
        </SectionContent>
        <SectionTitle className="mt-2">SDK</SectionTitle>
        <SectionContent className="p-0">
          <div className="flex px-1.5 py-1 items-center [&:not(:last-child)]:border-b">
            <SDK
              lastAttemptServer={data?.sdk_version ?? undefined}
              className="text-xs font-medium text-zinc-600 gap-1"
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
            <SectionContent className="px-2 py-1 text-code text-gray-500 font-medium">
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
          <SectionContent className="font-mono py-1 flex items-center pr-0.5 text-zinc-600 text-code">
            <div>{data?.id}</div>
            {data?.id && (
              <Copy
                copyText={data?.id}
                className=" [&_svg]:w-3 [&_svg]:h-3 shrink-0 text-2xs p-1"
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
    <div className="bg-white [&:not(:last-child)]:border-b [&:first-child]:rounded-t-[calc(0.75rem-0.125rem)] [&:last-child]:rounded-b-[calc(0.75rem-0.125rem)] gap-1 px-2 py-0 items-center text-code text-zinc-600 truncate grid [grid-template-columns:1fr_2fr]">
      <div className="items-start flex min-w-0 border-r py-1 pr-1 relative">
        <TruncateWithTooltip copyText={name}>{name}</TruncateWithTooltip>
      </div>
      <div className="min-w-0 flex py-1 pl-1">
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      </div>
    </div>
  );
}

function getProtocolType(deployment?: Deployment) {
  if (!deployment) {
    return undefined;
  }
  if (isHttpDeployment(deployment)) {
    return deployment.protocol_type;
  }
  return 'RequestResponse';
}
