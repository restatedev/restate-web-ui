import { Form, useFetcher } from '@remix-run/react';
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
import {
  useAccountParam,
  toAccountRoute,
} from '@restate/features/cloud/utils-routes';
import { Icon, IconName } from '@restate/ui/icons';
import { logOut } from '@restate/util/auth';
import { Account } from '@restate/data-access/cloud/api-client';

interface AccountSelectorProps {
  accounts: Account[];
}

export function AccountSelector({ accounts }: AccountSelectorProps) {
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
        <Button
          variant="secondary"
          className="flex gap-3 items-center bg-white h-14 px-4 pr-2"
        >
          <Icon name={IconName.RestateEnvironment} className="text-xl" />
          <Icon name={IconName.ChevronsUpDown} className="text-gray-400" />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu
          selectable
          selectedItems={currentAccount}
          className="pb-0"
        >
          <DropdownSection title="Switch accounts">
            {accounts.map((account) => (
              <DropdownItem
                key={account.accountId}
                href={toAccountRoute(account)}
                value={account.accountId}
              >
                <div>
                  <div>{account.accountId}</div>
                  <div className="opacity-60">{account.description}</div>
                </div>
              </DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
        <DropdownMenu
          className="pt-0"
          onSelect={() =>
            fetcher.submit({}, { action: '/accounts', method: 'POST' })
          }
        >
          <DropdownItem>
            <div className="flex items-center gap-2">
              <Icon name={IconName.Plus} className="opacity-60" />
              Create Account
            </div>
          </DropdownItem>
        </DropdownMenu>
        <DropdownSeparator />
        <DropdownMenu
          className="bg-gray-100/60 dark:bg-zinc-700/60"
          onSelect={() => logOut()}
        >
          <DropdownItem>
            <div className="flex items-center gap-2">
              <Icon name={IconName.LogOut} className="opacity-60" />
              Log Out
            </div>
          </DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
