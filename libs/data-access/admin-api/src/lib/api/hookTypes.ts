import type { paths } from '@restate/data-access/admin-api-spec';
import type {
  MutationOptions,
  OperationBody,
  OperationParameters,
  QueryOptions,
  SupportedMethods,
} from './client';

export type HookQueryOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
> = Omit<QueryOptions<Path, Method>, 'queryFn' | 'queryKey'>;
export type HookMutationOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method> = OperationParameters<
    Path,
    Method
  >,
  Body extends OperationBody<Path, Method> = OperationBody<Path, Method>,
> = Omit<
  MutationOptions<Path, Method, Parameters, Body>,
  'mutationFn' | 'mutationKey'
>;
