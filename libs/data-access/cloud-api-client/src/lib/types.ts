import { listAccounts } from './operations';

export type Account = NonNullable<
  Awaited<ReturnType<typeof listAccounts>>['data']
>['accounts'][number];
