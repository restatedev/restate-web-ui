import { Await, Form, useFetcher, useLoaderData } from '@remix-run/react';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownSeparator,
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
        <Button variant="secondary" disabled className="pl-28 shadow-sm">
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
                className="flex gap-3 items-center backdrop-blur-xl backdrop-saturate-150 h-14 pr-2 pl-28 shadow-sm bg-gray-50/90"
              >
                <div className="flex flex-col items-start">
                  <div>{environmentDetails?.data?.environmentId}:</div>
                  <div className="opacity-60  text-sm">
                    {environmentDetails?.data?.description}
                  </div>
                </div>
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="text-gray-400"
                />
              </Button>
            </DropdownTrigger>

            <DropdownPopover>
              <DropdownMenu
                className="pb-0"
                selectable
                {...(environmentDetails?.data?.environmentId && {
                  selectedItems: [environmentDetails.data?.environmentId],
                })}
              >
                <DropdownSection title="Switch environment">
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
                            <div>
                              <div>
                                {environmentDetails?.data?.environmentId}:
                              </div>
                              <div className="opacity-60">
                                {environmentDetails?.data?.description}
                              </div>
                            </div>
                          )}
                        </Await>
                      </Suspense>
                    </DropdownItem>
                  ))}
                </DropdownSection>
              </DropdownMenu>
              <DropdownSeparator />
              <DropdownMenu
                className="bg-gray-100/60 dark:bg-zinc-700/60"
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
                    <Icon name={IconName.Plus} className="opacity-60" />
                    Create Environment
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
