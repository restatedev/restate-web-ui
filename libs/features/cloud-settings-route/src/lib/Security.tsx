import { useRouteLoaderData, Await } from '@remix-run/react';
import { environments } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy, SnippetTabs } from '@restate/ui/code';
import { Details, Summary } from '@restate/ui/details';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';
import { Loading } from './Loading';

const awsIdentityRole = (id: string) =>
  JSON.stringify(
    {
      Sid: 'AllowRestateCloudToAssumeRole',
      Effect: 'Allow',
      Principal: {
        AWS: 'AROAZQ3DNV5IY6KP4ODO4',
      },
      Action: ['sts:AssumeRole', 'sts:TagSession'],
      Condition: {
        StringEquals: {
          'sts:ExternalId': id,
        },
      },
    },
    null,
    4
  );

export function Security({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise = environmentsResponse?.[environmentId];

  return (
    <Section>
      <SectionTitle>
        Security
        <p>
          For secure and reliable communications between your services and
          restate Cloud, please follow these guidelines.
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col relative min-h-[12rem]">
        <Suspense fallback={<Loading className="rounded-xl" />}>
          {isLoading ? (
            <Loading className="rounded-xl" />
          ) : (
            <Await resolve={environmentDetailsPromise}>
              {(environmentDetails) => (
                <>
                  <Details>
                    <Summary>
                      AWS Lambda
                      <span className="text-gray-500 text-sm block mt-2 pointer-events-none">
                        To invoke services running on AWS Lambda, restate Cloud
                        must assume an AWS identity within the same account that
                        the Lambda is deployed.
                      </span>
                    </Summary>
                    <div className="text-sm flex flex-col gap-2">
                      Create a new role that has permission to invoke your
                      Lambda and give it this trust policy:
                      <Code>
                        <Snippet language="json">
                          {awsIdentityRole(environmentId)}
                          <SnippetCopy
                            copyText={awsIdentityRole(environmentId)}
                          />
                        </Snippet>
                      </Code>
                      <br />
                      You can register Lambdas with:
                      <Code>
                        <Snippet>
                          {`restate dp add <LAMBDA_FUNCTION_ARN> --assume-role-arn <ROLE_ARN>`}
                        </Snippet>
                      </Code>
                    </div>
                  </Details>
                  <Details>
                    <Summary>
                      HTTP services{' '}
                      <div className="text-gray-500 text-sm block mt-2 pointer-events-none">
                        restate Cloud signs all of its requests to your
                        services, allowing you to confirm that the requests are
                        coming from this environment.
                      </div>
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
                      <br />
                      You must provide the public key to the restate SDK to
                      ensure it only accepts requests from this environment:
                      <Code>
                        <SnippetTabs
                          languages={['typescript', 'java']}
                          defaultLanguage="typescript"
                        >
                          {(language) => {
                            if (language === 'typescript') {
                              return (
                                <Snippet
                                  language="typescript"
                                  className="ml-2 -indent-2"
                                >
                                  {`restate.endpoint()\n.bind(myService)\n.withIdentityV1("${environmentDetails?.data?.signingPublicKey}")\n.listen();`}
                                </Snippet>
                              );
                            } else
                              return (
                                <Snippet
                                  language="java"
                                  className="ml-2 -indent-2"
                                >{`RestateHttpEndpointBuilder.builder()\n.bind(new MyService())\n.withRequestIdentityVerifier(RequestIdentityVerifier.fromKey("${environmentDetails?.data?.signingPublicKey}"))\n.buildAndListen();`}</Snippet>
                              );
                          }}
                        </SnippetTabs>
                      </Code>
                    </div>
                  </Details>
                </>
              )}
            </Await>
          )}
        </Suspense>
      </SectionContent>
    </Section>
  );
}
