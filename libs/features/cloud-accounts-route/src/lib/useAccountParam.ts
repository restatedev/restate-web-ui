import { useParams } from '@remix-run/react';

export function useAccountParam() {
  const params = useParams<{ accountId: string }>();
  return params.accountId;
}
