import { useSearchParams } from '@remix-run/react';
import { cloudApi } from '@restate/data-access/cloud/api-client';
import { tv } from 'tailwind-variants';
import { RoleId } from './RoleId';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { DELETE_API_KEY_PARAM_NAME } from './constants';
import { ErrorBanner } from '@restate/ui/error';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import invariant from 'tiny-invariant';
import { useQuery } from '@tanstack/react-query';
import { Loading } from './Loading';

const styles = tv({
  base: 'bg-white peer border px-4 pr-2 py-3 first:rounded-t-xl last:rounded-b-xl border-b-0 last:border-b',
  variants: {
    state: {
      ERROR: '',
      ACTIVE: '',
      DELETED:
        'border-none opacity-70 [filter:grayscale(100%)] [&_code]:line-through decoration-gray-600/50',
    },
  },
  defaultVariants: {
    state: 'ACTIVE',
  },
});
const keyStyles = tv({
  base: 'flex gap-2  flex-auto items-center',
  variants: {
    state: {
      ACTIVE: '',
      DELETED: '',
    },
  },
  defaultVariants: {
    state: 'ACTIVE',
  },
});

function LoadingKey() {
  return (
    <Loading className="h-[4.625rem] w-full first:rounded-t-xl last:rounded-b-xl border-b-0 last:border-b border-gray-100 relative" />
  );
}

export function ApiKeyItem({ keyId }: { keyId: string }) {
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const {
    data: apiKeyDetails,
    isError,
    isLoading,
  } = useQuery({
    ...cloudApi.describeApiKey({ accountId, environmentId, keyId }),
  });
  const [, setSearchParams] = useSearchParams();

  if (isLoading) {
    return <LoadingKey />;
  }
  if (isError) {
    return (
      <li className={styles({ state: 'ERROR' })}>
        <ErrorBanner
          errors={[new Error(`Failed to load details for ${keyId}.`)]}
        />
      </li>
    );
  }

  const isActive = apiKeyDetails?.state === 'ACTIVE';

  return (
    <li className={styles({ state: apiKeyDetails?.state })}>
      <div className={keyStyles({ state: apiKeyDetails?.state })}>
        <div className="flex flex-col gap-1">
          <div className="flex gap-x-2 flex-wrap gap-y-1">
            <code className="text-sm text-gray-600 inline-flex items-center">
              {apiKeyDetails?.keyId}
            </code>
            {apiKeyDetails && <RoleId roleId={apiKeyDetails?.roleId} />}
          </div>
          <div className="text-gray-500 flex gap-2 text-sm">
            {apiKeyDetails?.description}
          </div>
        </div>
        {isActive && (
          <Button
            variant="icon"
            className="text-red-500 shadow-none text-xs ml-auto p-2"
            onClick={() =>
              setSearchParams(
                (perv) => {
                  perv.set(DELETE_API_KEY_PARAM_NAME, apiKeyDetails.keyId);
                  return perv;
                },
                { preventScrollReset: true }
              )
            }
          >
            <Icon name={IconName.Trash} />
          </Button>
        )}
      </div>
    </li>
  );
}
