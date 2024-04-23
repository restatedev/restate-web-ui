import {
  describeEnvironment,
  listEnvironments,
} from '@restate/data-access/cloud/api-client';
import { withCache } from '@restate/util/cache';

export const listEnvironmentsWithCache = withCache(listEnvironments);
export const describeEnvironmentWithCache = withCache(describeEnvironment);
