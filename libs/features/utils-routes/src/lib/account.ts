import { useParams } from '@remix-run/react';
import type { Account } from '@restate/data-access/cloud/api-client';

export function useAccountParam() {
  const params = useParams<{ accountId: string }>();
  return params.accountId;
}

export function toAccountRoute(account: Account) {
  return `/accounts/${account.accountId}/environments`;
}
