import { Form, useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import {
  useAccountParam,
  toAccountRoute,
} from '@restate/features/cloud/utils-routes';
import { Icon, IconName } from '@restate/ui/icons';
import { logOut } from '@restate/util/auth';
import { Account } from '@restate/data-access/cloud/api-client';
import { CreateAccount } from './CreateAccount';
import { CREATE_ACCOUNT_PARAM_NAME } from './constants';

interface AccountSelectorProps {
  accounts: Account[];
}

export function AccountSelector({ accounts }: AccountSelectorProps) {
  const currentAccountId = useAccountParam();
  const currentAccount = accounts
    .filter(({ accountId }) => accountId === currentAccountId)
    .map(({ accountId }) => accountId);
  const [, setSearchParams] = useSearchParams();

  if (currentAccount.length === 0) {
    return (
      <Form method="POST">
        <SubmitButton>Create Account</SubmitButton>
      </Form>
    );
  }

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="secondary"
            className="flex gap-2 items-center bg-white pl-3 pr-2 shadow-sm h-full"
          >
            <Icon name={IconName.RestateEnvironment} className="text-xl" />
            <Icon name={IconName.ChevronsUpDown} className="text-gray-400" />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownSection title="Switch accounts">
            <DropdownMenu selectable selectedItems={currentAccount}>
              {accounts.map((account) => (
                <DropdownItem
                  key={account.accountId}
                  href={toAccountRoute(account)}
                  value={account.accountId}
                >
                  <div>
                    <div>{account.accountId}</div>
                    <div className="text-gray-500 group-focus:text-gray-300">
                      {account.description}
                    </div>
                  </div>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
          <DropdownMenu
            autoFocus={false}
            onSelect={() =>
              setSearchParams(
                (perv) => {
                  perv.set(CREATE_ACCOUNT_PARAM_NAME, 'true');
                  return perv;
                },
                { preventScrollReset: true }
              )
            }
          >
            <DropdownItem>
              <div className="flex items-center gap-2">
                <Icon name={IconName.Plus} className="opacity-80" />
                Create account
              </div>
            </DropdownItem>
          </DropdownMenu>
          <DropdownMenu autoFocus={false} onSelect={() => logOut()}>
            <DropdownItem destructive>
              <div className="flex items-center gap-2">
                <Icon name={IconName.LogOut} className="opacity-80" />
                Log out
              </div>
            </DropdownItem>
          </DropdownMenu>
        </DropdownPopover>
      </Dropdown>
      <CreateAccount />
    </>
  );
}
