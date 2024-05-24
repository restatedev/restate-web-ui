import { useRouteLoaderData, Await } from '@remix-run/react';
import { environments } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Details, Summary } from '@restate/ui/details';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';

const AWS_IDENTITY = JSON.stringify(
  {
    Sid: 'AllowRestateCloudToAssumeRole',
    Effect: 'Allow',
    Principal: {
      AWS: 'AROAZQ3DNV5IY6KP4ODO4',
    },
    Action: ['sts:AssumeRole', 'sts:TagSession'],
    Condition: {
      StringEquals: {
        'sts:ExternalId': '$ENVIRONMENT_ID',
      },
    },
  },
  null,
  4
);

export function Security() {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise =
    environmentsResponse?.environmentsWithDetailsPromises[environmentId];

  return (
    <Section>
      <SectionTitle>
        Security
        <p>
          To invoke your handlers or manage your services, deployments, and
          invocations in this environment over HTTP, please use this URLs.
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col">
        <Suspense>
          <Await resolve={environmentDetailsPromise}>
            {(environmentDetails) => (
              <>
                <Details>
                  <Summary>
                    AWS Lambda
                    <span className="text-gray-500 text-sm block mt-2">
                      To invoke services running on AWS Lambda, Restate Cloud
                      must assume an AWS identity within the same account that
                      the Lambda is deployed.
                    </span>
                  </Summary>
                  <div className="text-sm flex flex-col gap-2">
                    Create a new role that has permission to invoke your Lambda
                    and give it this trust policy:
                    <Code className="whitespace-pre">
                      <Snippet>
                        {AWS_IDENTITY}
                        <SnippetCopy copyText={AWS_IDENTITY} />
                      </Snippet>
                    </Code>
                    You can register Lambdas with
                    <Code className="whitespace-pre">
                      <Snippet>
                        {`restate dp add <LAMBDA_FUNCTION_ARN> --assume-role-arn <ROLE_ARN>`}
                        <SnippetCopy
                          copyText={`restate dp add <LAMBDA_FUNCTION_ARN> --assume-role-arn <ROLE_ARN>`}
                        />
                      </Snippet>
                    </Code>
                  </div>
                </Details>
                <Details>
                  <Summary>
                    HTTP services{' '}
                    <span className="text-gray-500 text-sm block mt-2">
                      restate Cloud signs all of its requests to your services,
                      allowing you to confirm that the requests are coming from
                      this environment.
                    </span>
                  </Summary>
                  <div className="text-sm flex flex-col gap-2">
                    You can verify requests coming from this environment using
                    its unique public key:
                    <Code>
                      <Snippet>
                        {environmentDetails?.data?.signingPublicKey}
                        <SnippetCopy
                          copyText={
                            environmentDetails?.data?.signingPublicKey ?? ''
                          }
                        />
                      </Snippet>
                    </Code>
                  </div>
                </Details>
              </>
            )}
          </Await>
        </Suspense>
      </SectionContent>
    </Section>
  );
}
