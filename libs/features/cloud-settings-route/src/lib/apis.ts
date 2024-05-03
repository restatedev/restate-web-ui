import { listApiKeys } from '@restate/data-access/cloud/api-client';
import { withCache } from '@restate/util/cache';

export const listApiKeysWithCache = withCache(listApiKeys);
