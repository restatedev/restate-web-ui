import { useEnvironmentDetails } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy, SnippetTabs } from '@restate/ui/code';
import { Details, Summary } from '@restate/ui/details';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { LearnMore } from './LearnMore';

const awsRoleTrustPolicy = (environmentId: string) =>
  JSON.stringify(
    {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: 'arn:aws:iam::654654156625:root',
          },
          Action: 'sts:AssumeRole',
          Condition: {
            StringEquals: {
              'aws:PrincipalArn': 'arn:aws:iam::654654156625:role/RestateCloud',
              'sts:ExternalId': environmentId,
            },
          },
        },
        {
          Effect: 'Allow',
          Principal: {
            AWS: 'arn:aws:iam::654654156625:root',
          },
          Action: 'sts:TagSession',
        },
      ],
    },
    null,
    4
  );

export function Security({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();
  const environmentDetails = useEnvironmentDetails();
  invariant(environmentId, 'Missing environmentId param');

  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.Security}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          Security
        </span>
        <p>
          For secure and reliable communications between your services and
          Restate Cloud, please follow these guidelines.{' '}
          <LearnMore href="https://docs.restate.dev/deploy/cloud#securing-your-services" />
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col relative min-h-[12rem]">
        <Suspense fallback={<Loading className="rounded-xl" />}>
          {isLoading ? (
            <Loading className="rounded-xl" />
          ) : (
            <>
              <Details>
                <Summary>
                  AWS Lambda
                  <span className="text-gray-500 text-sm block mt-2 pointer-events-none">
                    To invoke services running on AWS Lambda, Restate Cloud must
                    assume an AWS identity that has permission to call the
                    Lambda.
                  </span>
                </Summary>
                <div className="text-sm flex flex-col gap-2">
                  Create a new role that has permission to invoke your Lambda
                  and give it this trust policy:
                  <Code>
                    <Snippet language="json">
                      {awsRoleTrustPolicy(environmentId)}
                      <SnippetCopy
                        copyText={awsRoleTrustPolicy(environmentId)}
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
              <Details disabled={!environmentDetails?.data}>
                <Summary>
                  HTTP services{' '}
                  <div className="text-gray-500 text-sm block mt-2 pointer-events-none">
                    Restate Cloud signs all of its requests to your services,
                    allowing you to confirm that the requests are coming from
                    this environment.
                  </div>
                </Summary>
                <div className="text-sm flex flex-col gap-2">
                  You can verify requests coming from this environment using its
                  unique public key:
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
                  You must provide the public key to the Restate SDK to ensure
                  it only accepts requests from this environment:
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
        </Suspense>
      </SectionContent>
    </Section>
  );
}