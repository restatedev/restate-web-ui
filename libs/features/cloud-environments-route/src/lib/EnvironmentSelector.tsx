import { Form, useFetcher } from '@remix-run/react';
import type { Environment } from '@restate/data-access/cloud-api-client';
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
import { useEnvironmentParam } from './useEnvironmentParam';
import { toEnvironmentRoute } from './toEnvironmentRoute';
import invariant from 'tiny-invariant';

interface EnvironmentSelectorProps {
  environments?: Environment[];
}

export function EnvironmentSelector({
  environments = [],
}: EnvironmentSelectorProps) {
  const currentAccountId = useAccountParam();
  invariant(currentAccountId, 'Account id is missing');
  const currentEnvironmentId = useEnvironmentParam();
  const currentEnvironment = environments
    .filter(({ environmentId }) => environmentId === currentEnvironmentId)
    .map(({ environmentId }) => environmentId);
  const fetcher = useFetcher();

  if (currentEnvironment.length === 0) {
    return (
      <Form method="POST">
        <Button type="submit">Create Environment</Button>
      </Form>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button>{currentEnvironment.at(0)}</Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu selectable selectedItems={currentEnvironment}>
          {environments.map((environment) => (
            <DropdownItem
              key={environment.environmentId}
              href={toEnvironmentRoute(currentAccountId, environment)}
              value={environment.environmentId}
            >
              {environment.environmentId}
            </DropdownItem>
          ))}
        </DropdownMenu>
        <DropdownSeparator />
        <DropdownMenu onSelect={() => fetcher.submit({}, { method: 'POST' })}>
          <DropdownItem>Create Environment</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
