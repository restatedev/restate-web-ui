import { Form, useFetcher } from '@remix-run/react';
import type { Account } from '@restate/data-access/cloud/api-client';
import {
  toAccountRoute,
  useAccountParam,
} from '@restate/features/cloud/accounts-route';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSeparator,
  DropdownTrigger,
} from '@restate/ui/dropdown';

interface AccountSelectorProps {
  accounts?: Account[];
}

export function AccountSelector({ accounts = [] }: AccountSelectorProps) {
  const currentAccountId = useAccountParam();
  const currentAccount = accounts
    .filter(({ accountId }) => accountId === currentAccountId)
    .map(({ accountId }) => accountId);
  const fetcher = useFetcher();

  if (currentAccount.length === 0) {
    return (
      <Form method="POST">
        <Button type="submit">Create Account</Button>
      </Form>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">{currentAccount.at(0)}</Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu selectable selectedItems={currentAccount}>
          {accounts.map((account) => (
            <DropdownItem
              key={account.accountId}
              href={toAccountRoute(account)}
              value={account.accountId}
            >
              {account.accountId}
            </DropdownItem>
          ))}
        </DropdownMenu>
        <DropdownSeparator />
        <DropdownMenu onSelect={() => fetcher.submit({}, { method: 'POST' })}>
          <DropdownItem>Create Account</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
