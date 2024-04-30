import { Await, Form, useFetcher, useLoaderData } from '@remix-run/react';
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
} from '@restate/features/cloud/utils-routes';
import { Icon, IconName } from '@restate/ui/icons';
import { EnvironmentStatus, MiniEnvironmentStatus } from './EnvironmentStatus';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentSelectorProps {}

export function EnvironmentSelector(props: EnvironmentSelectorProps) {
  const currentAccountId = useAccountParam();
  const { environments, environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');
  const fetcher = useFetcher();

  if (!currentEnvironmentParam) {
    return (
      <Form method="POST">
        <Button type="submit">Create Environment</Button>
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
      <Await resolve={environmentsWithDetailsPromises[currentEnvironmentParam]}>
        {(environmentDetails) => (
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="secondary"
                className="flex items-center gap-2 px-2 py-1 bg-transparent border-none "
              >
                <div className="flex flex-col items-start">
                  <div>{environmentDetails?.data?.environmentId}:</div>
                  <div className="inline-flex gap-2 items-center">
                    {environmentDetails?.data?.status && (
                      <MiniEnvironmentStatus
                        status={environmentDetails.data.status}
                      />
                    )}
                    <span className="opacity-60">
                      {environmentDetails?.data?.description}
                    </span>
                  </div>
                </div>
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="text-gray-400"
                />
              </Button>
            </DropdownTrigger>

            <DropdownPopover>
              <DropdownSection title="Switch environment">
                <DropdownMenu
                  selectable
                  {...(environmentDetails?.data?.environmentId && {
                    selectedItems: [environmentDetails.data?.environmentId],
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
                            environmentsWithDetailsPromises[
                              environment.environmentId
                            ]
                          }
                          errorElement={<p>failed to load</p>}
                        >
                          {(environmentDetails) => (
                            <div className="flex flex-col">
                              <div>
                                {environmentDetails?.data?.environmentId}:
                              </div>
                              <div className="inline-flex gap-2 items-center pt-2">
                                {environmentDetails?.data?.status && (
                                  <EnvironmentStatus
                                    status={environmentDetails.data.status}
                                  />
                                )}
                                <span className="opacity-60">
                                  {environmentDetails?.data?.description}
                                </span>
                              </div>
                            </div>
                          )}
                        </Await>
                      </Suspense>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </DropdownSection>
              <DropdownMenu
                autoFocus={false}
                onSelect={() =>
                  fetcher.submit(
                    {},
                    {
                      method: 'POST',
                      action: `/accounts/${currentAccountId}/environments`,
                    }
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
                  fetcher.submit(
                    {},
                    {
                      method: 'POST',
                      action: `/accounts/${currentAccountId}/environments`,
                    }
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
        )}
      </Await>
    </Suspense>
  );
}
