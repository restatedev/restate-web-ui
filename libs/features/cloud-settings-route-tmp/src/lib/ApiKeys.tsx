import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import { ApiKeyItem } from './ApiKeyItem';
import { CreateApiKey } from './CreateApiKey';
import { DeleteAPIKey } from './DeleteAPIKey';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import invariant from 'tiny-invariant';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { LearnMore } from './LearnMore';
import { useEnvironmentDetails } from '@restate/features/cloud/environments-route';

export function ApiKeys({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();
  invariant(environmentId, 'Missing environmentId param');

  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.ApiKey}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          API keys
        </span>
        <p>
          To interact with your Restate Cloud environment programmatically, you
          will need an API key.{' '}
          <LearnMore href="https://docs.restate.dev/deploy/cloud#api-tokens" />
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative">
        <Suspense fallback={<LoadingKeys />}>
          {isLoading ? <LoadingKeys /> : <APIKeysList />}
        </Suspense>
      </SectionContent>
    </Section>
  );
}

function APIKeysList() {
  const environmentDetails = useEnvironmentDetails();

  if (environmentDetails.isLoading) {
    return <LoadingKeys />;
  }

  return (
    <>
      <ul className="flex flex-col gap-0 shadow-sm rounded-xl">
        {(environmentDetails.data?.apiKeys ?? []).map(({ keyId }) => (
          <ApiKeyItem keyId={keyId} key={keyId} />
        ))}
      </ul>
      <div>
        <CreateApiKey
          hasAnyKeys={(environmentDetails.data?.apiKeys ?? []).length > 0}
        />
      </div>
      <DeleteAPIKey />
    </>
  );
}

function LoadingKeys() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <LoadingKey />
        <LoadingKey />
      </div>
      <div className="relative h-[2.4rem] w-[10.5rem]">
        <Loading className="rounded-xl" />
      </div>
    </div>
  );
}
function LoadingKey() {
  return (
    <Loading className="h-[4.625rem] w-full first:rounded-t-xl last:rounded-b-xl border-b-0 last:border-b border-gray-100 relative" />
  );
}