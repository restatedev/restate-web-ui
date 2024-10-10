import { components } from './api';
import {
  describeApiKey,
  describeEnvironment,
  listAccounts,
} from './operations';

export type Account = NonNullable<
  Awaited<ReturnType<typeof listAccounts>>['data']
>['accounts'][number];
export type Environment = NonNullable<
  Awaited<ReturnType<typeof describeEnvironment>>['data']
>;
export type Role = components['schemas']['RoleId'];
export type LogLine =
  components['schemas']['GetEnvironmentLogsResponse']['lines'][number];
export type ApiKeyDetails = NonNullable<
  Awaited<ReturnType<typeof describeApiKey>>['data']
>;
