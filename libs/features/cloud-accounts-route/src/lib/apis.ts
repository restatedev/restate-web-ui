import { listAccounts } from '@restate/data-access/cloud/api-client';
import { withCache } from '@restate/util/cache';

export const listAccountsWithCache = withCache(listAccounts);
