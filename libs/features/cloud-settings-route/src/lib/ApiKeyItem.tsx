import { useAsyncValue, useSearchParams } from '@remix-run/react';
import { describeApiKey } from '@restate/data-access/cloud/api-client';
import { tv } from 'tailwind-variants';
import { RoleId } from './RoleId';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { DELETE_API_KEY_PARAM_NAME } from './constants';
import { ErrorBanner } from '@restate/ui/error';

const styles = tv({
  base: 'bg-white peer border shadow-sm px-4 py-3 first:rounded-t-xl last:rounded-b-xl border-b-0 last:border-b',
  variants: {
    state: {
      ERROR: '',
      ACTIVE: '',
      DELETED:
        'shadow-none border-none opacity-70 [filter:grayscale(100%)] [&_code]:line-through decoration-gray-600/50',
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
export function ApiKeyItem({ keyId }: { keyId: string }) {
  const apiKeyDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeApiKey>
  >;
  const [, setSearchParams] = useSearchParams();

  if (apiKeyDetails.error) {
    return (
      <li className={styles({ state: 'ERROR' })}>
        <ErrorBanner
          errors={[new Error(`Failed to load details for ${keyId}.`)]}
        />
      </li>
    );
  }
  const isActive = apiKeyDetails.data.state === 'ACTIVE';

  return (
    <li className={styles({ state: apiKeyDetails.data.state })}>
      <div className={keyStyles({ state: apiKeyDetails.data.state })}>
        <div className="flex flex-col gap-1">
          <div className="flex gap-x-2 flex-wrap gap-y-1">
            <code className="text-sm text-gray-600">
              {apiKeyDetails.data.keyId}
            </code>
            <RoleId roleId={apiKeyDetails.data.roleId} />
          </div>
          <div className="text-gray-500 flex gap-2 text-sm">
            {apiKeyDetails.data.description}
          </div>
        </div>
        {isActive && (
          <Button
            variant="icon"
            className="text-red-500 shadow-none text-xs ml-auto p-2"
            onClick={() =>
              setSearchParams(
                (perv) => {
                  perv.set(DELETE_API_KEY_PARAM_NAME, apiKeyDetails.data.keyId);
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
