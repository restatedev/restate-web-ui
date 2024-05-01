import {
  Await,
  Form,
  useAsyncError,
  useAsyncValue,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
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
} from '@restate/features/cloud/utils-routes';
import { Icon, IconName } from '@restate/ui/icons';
import { EnvironmentStatus, MiniEnvironmentStatus } from './EnvironmentStatus';
import { CreateEnvironment } from './CreateEnvironment';
import {
  CREATE_ENVIRONMENT_PARAM_NAME,
  DELETE_ENVIRONMENT_PARAM_NAME,
} from './constants';
import { DeleteEnvironment } from './DeleteEnvironment';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentSelectorProps {}

export function EnvironmentSelector(props: EnvironmentSelectorProps) {
  const currentAccountId = useAccountParam();
  const { environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');

  if (!currentEnvironmentParam) {
    return (
      <Form method="POST">
        <SubmitButton>Create Environment</SubmitButton>
      </Form>
    );
  }

  return (
    <Suspense
      fallback={
        <Button variant="secondary" disabled>
          loading
        </Button>
      }
    >
      <Await
        resolve={environmentsWithDetailsPromises[currentEnvironmentParam]}
        errorElement={<EnvironmentSelectorContent />}
      >
        <EnvironmentSelectorContent />
      </Await>
      <CreateEnvironment />
      <DeleteEnvironment />
    </Suspense>
  );
}

function EnvironmentSelectorContent() {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const { environments, environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const [, setSearchParams] = useSearchParams();
  const currentAccountId = useAccountParam();
  const currentEnvironmentId = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');

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
                {environmentDetails?.data?.environmentId ??
                  currentEnvironmentId}
              </div>
              <div className="truncate opacity-60 col-start-2 row-start-2 w-full">
                {environmentDetails?.data?.description}
              </div>
            </div>
          </div>
          <Icon name={IconName.ChevronsUpDown} className="text-gray-400" />
        </Button>
      </DropdownTrigger>

      <DropdownPopover>
        <DropdownSection title="Switch environment" className="max-w-xl">
          <DropdownMenu
            selectable
            {...(currentEnvironmentId && {
              selectedItems: [currentEnvironmentId],
            })}
          >
            {environments.map((environment) => (
              <DropdownItem
                href={toEnvironmentRoute(currentAccountId, environment)}
                key={environment.environmentId}
                value={environment.environmentId}
              >
                <Suspense fallback={<p>loading env</p>}>
                  <Await
                    resolve={
                      environmentsWithDetailsPromises[environment.environmentId]
                    }
                    errorElement={<p>failed to load</p>}
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
        <DropdownMenu
          autoFocus={false}
          onSelect={() =>
            setSearchParams((perv) => {
              perv.set(CREATE_ENVIRONMENT_PARAM_NAME, 'true');
              return perv;
            })
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
            setSearchParams((perv) => {
              perv.set(DELETE_ENVIRONMENT_PARAM_NAME, 'true');
              return perv;
            })
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
        {environmentDetails?.data?.environmentId ?? environmentId}
      </div>
      {environmentDetails?.data && (
        <div className="inline-flex gap-2 items-center pt-2">
          {environmentDetails?.data?.status && (
            <EnvironmentStatus status={environmentDetails.data.status} />
          )}
          <span className="truncate opacity-60">
            {environmentDetails?.data?.description}
          </span>
        </div>
      )}
    </div>
  );
}
