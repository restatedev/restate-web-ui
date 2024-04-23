import { Form, useFetcher, useLoaderData } from '@remix-run/react';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSeparator,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { useAccountParam } from './useAccountParam';
import { toAccountRoute } from './toAccountRoute';
import { clientLoader } from './loader';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AccountSelectorProps {}

export function AccountSelector(props: AccountSelectorProps) {
  const { accounts } = useLoaderData<typeof clientLoader>();

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
