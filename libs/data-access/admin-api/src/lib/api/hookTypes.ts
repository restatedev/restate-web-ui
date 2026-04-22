import type { paths } from '@restate/data-access/admin-api-spec';
import type {
  DefaultOperationData,
  MutationOptions,
  OperationBody,
  OperationParameters,
  QueryOptions,
  SupportedMethods,
} from './client';

export type HookQueryOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Data = DefaultOperationData<Path, Method>,
> = Omit<QueryOptions<Path, Method, Data>, 'queryFn' | 'queryKey'>;
export type HookMutationOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method> = OperationParameters<
    Path,
    Method
  >,
  Body extends OperationBody<Path, Method> = OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
> = Omit<
  MutationOptions<Path, Method, Parameters, Body, Data>,
  'mutationFn' | 'mutationKey'
>;
