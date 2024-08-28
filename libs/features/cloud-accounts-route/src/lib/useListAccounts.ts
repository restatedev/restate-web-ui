import { cloudApi } from '@restate/data-access/cloud/api-client';
import { useQuery } from '@tanstack/react-query';

export function useListAccounts() {
  return useQuery({
    ...cloudApi.listAccounts(),
  });
}
