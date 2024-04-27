import { Form, useFetcher, useLoaderData } from '@remix-run/react';
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
import { clientLoader } from './loader';
import {
  useAccountParam,
  toAccountRoute,
} from '@restate/features/cloud/utils-routes';
import { Icon, IconName } from '@restate/ui/icons';
import { logOut } from '@restate/util/auth';

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
        <Button
          variant="secondary"
          className="flex gap-1 items-center backdrop-blur-xl backdrop-saturate-150 bg-white/90 h-12 px-2"
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
                  <div>{account.description}</div>
                </div>
              </DropdownItem>
            ))}
          </DropdownSection>
        </DropdownMenu>
        <DropdownMenu
          className="pt-0"
          onSelect={() => fetcher.submit({}, { method: 'POST' })}
        >
          <DropdownItem>Create Account</DropdownItem>
        </DropdownMenu>
        <DropdownSeparator />
        <DropdownMenu
          className="bg-gray-100/60 dark:bg-zinc-700/60"
          onSelect={() => logOut()}
        >
          <DropdownItem>Log out</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
