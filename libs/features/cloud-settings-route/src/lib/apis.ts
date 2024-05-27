import { describeApiKey } from '@restate/data-access/cloud/api-client';
import { withCache } from '@restate/util/cache';

export const describeApiKeyWithCache = withCache(describeApiKey);
