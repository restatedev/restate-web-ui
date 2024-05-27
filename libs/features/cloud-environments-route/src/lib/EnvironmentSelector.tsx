import {
  Await,
  useAsyncValue,
  useFetcher,
  useLoaderData,
  useLocation,
  useSearchParams,
} from '@remix-run/react';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import invariant from 'tiny-invariant';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import {
  useAccountParam,
  useEnvironmentParam,
  toEnvironmentRoute,
} from '@restate/features/cloud/routes-utils';
import { Icon, IconName } from '@restate/ui/icons';
import { EnvironmentStatus, MiniEnvironmentStatus } from './EnvironmentStatus';
import { CreateEnvironment } from './CreateEnvironment';
import {
  CREATE_ENVIRONMENT_PARAM_NAME,
  DELETE_ENVIRONMENT_PARAM_NAME,
} from './constants';
import { DeleteEnvironment } from './DeleteEnvironment';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { InlineError } from '@restate/ui/error';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentSelectorProps {}

export function EnvironmentSelector(props: EnvironmentSelectorProps) {
  const currentAccountId = useAccountParam();
  const { environmentList, ...environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');
  const { state } = useFetcher({ key: 'describeEnvironment' });
  const isLoading = state === 'loading';

  if (!currentEnvironmentParam) {
    return <CreateEnvironment />;
  }

  if (environmentList.error) {
    return (
      <Await resolve={environmentList}>
        <EnvironmentSelectorContent />
      </Await>
    );
  }

  return (
    <Suspense fallback={<EnvironmentSkeletonLoading />}>
      {isLoading ? (
        <EnvironmentSkeletonLoading />
      ) : (
        <Await
          resolve={environmentsWithDetailsPromises[currentEnvironmentParam]}
        >
          <EnvironmentSelectorContent />
        </Await>
      )}
      <CreateEnvironment />
      <DeleteEnvironment />
    </Suspense>
  );
}

function EnvironmentSelectorContent() {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const { environmentList, ...environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const [, setSearchParams] = useSearchParams();
  const currentAccountId = useAccountParam();
  const currentEnvironmentId = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');
  const location = useLocation();

  const relativePath = location.pathname
    .split(toEnvironmentRoute(currentAccountId, currentEnvironmentId!))
    .at(-1);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex items-center gap-2 px-2 py-1 bg-transparent border-none shadow-none"
        >
          <div className="flex flex-col items-start">
            <div className="grid gap-x-2 auto-cols-auto items-center justify-items-start text-start">
              {environmentDetails?.data?.status && (
                <div className="row-start-1">
                  <MiniEnvironmentStatus
                    status={environmentDetails.data.status}
                  />
                </div>
              )}
              <div className="truncate row-start-1 w-full">
                {environmentDetails?.data?.name ?? currentEnvironmentId}
              </div>
              <div className="truncate text-gray-500 col-start-2 row-start-2 w-full text-code">
                {environmentDetails?.data?.environmentId}
              </div>
              {environmentDetails?.error && (
                <InlineError className="truncate row-start-2 w-full col-start-1">
                  Failed to load the environment
                </InlineError>
              )}
            </div>
          </div>
          <Icon
            name={IconName.ChevronsUpDown}
            className="text-gray-400 flex-shrink-0"
          />
        </Button>
      </DropdownTrigger>

      <DropdownPopover>
        {(environmentList.data?.environments ?? []).length > 0 && (
          <DropdownSection title="Switch environment" className="max-w-xl">
            <DropdownMenu
              selectable
              {...(currentEnvironmentId && {
                selectedItems: [currentEnvironmentId],
              })}
            >
              {environmentList.data?.environments.map((environment) => (
                <DropdownItem
                  href={toEnvironmentRoute(
                    currentAccountId,
                    environment.environmentId,
                    relativePath + location.search
                  )}
                  key={environment.environmentId}
                  value={environment.environmentId}
                  className="group"
                >
                  <Suspense fallback={<p>loading env</p>}>
                    <Await
                      resolve={
                        environmentsWithDetailsPromises[
                          environment.environmentId
                        ]
                      }
                      errorElement={<p>Failed to load</p>}
                    >
                      <EnvironmentItem
                        environmentId={environment.environmentId}
                      />
                    </Await>
                  </Suspense>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
        <DropdownMenu
          autoFocus={false}
          onSelect={() =>
            setSearchParams(
              (perv) => {
                perv.set(CREATE_ENVIRONMENT_PARAM_NAME, 'true');
                return perv;
              },
              { preventScrollReset: true }
            )
          }
        >
          <DropdownItem>
            <div className="flex items-center gap-2">
              <Icon name={IconName.Plus} className="opacity-80" />
              Create environment
            </div>
          </DropdownItem>
        </DropdownMenu>
        <DropdownMenu
          autoFocus={false}
          onSelect={() =>
            setSearchParams(
              (perv) => {
                perv.set(DELETE_ENVIRONMENT_PARAM_NAME, 'true');
                return perv;
              },
              { preventScrollReset: true }
            )
          }
        >
          <DropdownItem destructive>
            <div className="flex items-center gap-2">
              <Icon name={IconName.Trash} className="opacity-80" />
              Delete environment
            </div>
          </DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}

function EnvironmentItem({ environmentId }: { environmentId: string }) {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;

  return (
    <div className="flex flex-col w-full">
      <div className="truncate">
        {environmentDetails?.data?.name ?? environmentId}
      </div>
      {environmentDetails.error && (
        <InlineError className="group-focus:text-red-100 truncate row-start-2 w-full col-start-1">
          Failed to load the environment
        </InlineError>
      )}
      {environmentDetails?.data && (
        <div className="inline-flex gap-2 items-center pt-2">
          {environmentDetails?.data?.status && (
            <EnvironmentStatus status={environmentDetails.data.status} />
          )}
          <span className="truncate text-gray-500 group-focus:text-gray-300 text-code">
            {environmentDetails?.data?.environmentId}
          </span>
        </div>
      )}
    </div>
  );
}

function EnvironmentSkeletonLoading() {
  return (
    <Button
      disabled
      variant="secondary"
      className="flex flex-auto items-center gap-2 px-2 py-1 bg-transparent border-none shadow-none max-w-[calc(30ch_+_1.5rem)]"
    >
      <div className="flex w-full flex-col items-start animate-pulse">
        <div className="grid w-full gap-x-2 gap-y-1 [grid-template-columns:1rem_1fr] items-center justify-items-start text-start">
          <div className="bg-slate-200 rounded row-start-1 w-4 h-4 min-w-0" />
          <div className="bg-slate-200 rounded row-start-1 max-w-[20ch] w-[80%] h-4 min-w-0" />
          <div className="bg-slate-200 rounded col-start-2 row-start-2 w-full max-w-[30ch] h-4 min-w-0" />
        </div>
      </div>
      <Icon name={IconName.ChevronsUpDown} className="text-gray-400" />
    </Button>
  );
}
