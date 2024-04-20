import type { Account } from '@restate/data-access/cloud/api-client';

export function toAccountRoute(account: Account) {
  return `/accounts/${account.accountId}/environments`;
}
