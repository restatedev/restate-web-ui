import { Await, Form, useFetcher, useLoaderData } from '@remix-run/react';
import { useAccountParam } from '@restate/features/cloud/accounts-route';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSeparator,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { toEnvironmentRoute } from './toEnvironmentRoute';
import invariant from 'tiny-invariant';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import { useEnvironmentParam } from './useEnvironmentParam';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentSelectorProps {}

export function EnvironmentSelector(props: EnvironmentSelectorProps) {
  const { environments, environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();

  const currentAccountId = useAccountParam();
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
              <Button variant="secondary">
                {environmentDetails?.data?.environmentId}:
                {environmentDetails?.data?.status}
              </Button>
            </DropdownTrigger>

            <DropdownPopover>
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
                          <>
                            {environmentDetails?.data?.environmentId}:
                            {environmentDetails?.data?.status}
                          </>
                        )}
                      </Await>
                    </Suspense>
                  </DropdownItem>
                ))}
              </DropdownMenu>
              <DropdownSeparator />
              <DropdownMenu
                onSelect={() => fetcher.submit({}, { method: 'POST' })}
              >
                <DropdownItem>Create Environment</DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
        )}
      </Await>
    </Suspense>
  );
}
