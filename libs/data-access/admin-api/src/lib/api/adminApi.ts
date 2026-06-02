/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { RestateError } from '@restate/util/errors';
import type {
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';
import type { FetchResponse, ParseAs } from 'openapi-fetch';
import type { paths } from '@restate/data-access/admin-api-spec';
import { client } from './client';

export type SupportedMethods<Path extends keyof paths> = keyof {
  [PossibleMethod in keyof paths[Path] as paths[Path][PossibleMethod] extends NonNullable<{
    parameters: {
      query?: unknown;
      header?: unknown;
      path?: unknown;
      cookie?: unknown;
    };
    responses: Record<number, any>;
  }>
    ? PossibleMethod
    : never]: paths[Path];
};

export type OperationParameters<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
> = paths[Path][Method] extends {
  parameters: {
    query?: unknown;
    header?: unknown;
    path?: unknown;
    cookie?: unknown;
  };
}
  ? paths[Path][Method]['parameters']
  : never;

export type OperationBody<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
> = paths[Path][Method] extends { requestBody: { content: infer Content } }
  ? Content[keyof Content]
  : never;

export type DefaultOperationData<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
> =
  paths[Path][Method] extends Record<string | number, any>
    ? FetchResponse<paths[Path][Method], {}, 'application/json'>['data']
    : never;

export type QueryOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Data = DefaultOperationData<Path, Method>,
> = paths[Path][Method] extends {
  responses: Record<number, any>;
}
  ? UseQueryOptions<Data, RestateError | Error>
  : never;

type QueryFn<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Data = DefaultOperationData<Path, Method>,
> = Extract<QueryOptions<Path, Method, Data>['queryFn'], Function>;

type QueryKey<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Data = DefaultOperationData<Path, Method>,
> = QueryOptions<Path, Method, Data>['queryKey'];

export type MutationOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
> = paths[Path][Method] extends { responses: Record<number, any> }
  ? UseMutationOptions<
      Data,
      RestateError | Error,
      {
        parameters?: Parameters;
        body?: Body;
      }
    >
  : never;

type MutationFn<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
> = Extract<
  MutationOptions<Path, Method, Parameters, Body, Data>['mutationFn'],
  Function
>;

type MutationKey<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
> = MutationOptions<Path, Method, Parameters, Body, Data>['mutationKey'];

type AdminApiInit<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
> = {
  baseUrl: string;
  parameters?: Parameters;
  body?: Body;
  resolvedPath?: string;
  headers?: Record<string, string>;
  parseAs?: ParseAs;
};

export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
>(
  type: 'query',
  path: Path,
  method: Method,
  init: AdminApiInit<Path, Method, Parameters, Body>,
): {
  queryFn: QueryFn<Path, Method, Data>;
  queryKey: QueryKey<Path, Method, Data>;
  meta: Record<string, unknown>;
  refetchOnMount?: boolean;
  staleTime?: number;
};
export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
>(
  type: 'mutate',
  path: Path,
  method: Method,
  init: AdminApiInit<Path, Method, Parameters, Body>,
): {
  mutationFn: MutationFn<Path, Method, Parameters, Body, Data>;
  mutationKey: MutationKey<Path, Method, Parameters, Body, Data>;
  meta: Record<string, unknown>;
};
export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>,
  Data = DefaultOperationData<Path, Method>,
>(
  type: 'query' | 'mutate',
  path: Path,
  method: Method,
  init: AdminApiInit<Path, Method, Parameters, Body>,
):
  | {
      queryFn: QueryFn<Path, Method, Data>;
      queryKey: QueryKey<Path, Method, Data>;
      meta: Record<string, unknown>;
      refetchOnMount?: boolean;
      staleTime?: number;
    }
  | {
      mutationFn: MutationFn<Path, Method, Parameters, Body, Data>;
      mutationKey: MutationKey<Path, Method, Parameters, Body, Data>;
      meta: Record<string, unknown>;
    } {
  const key = [
    init.resolvedPath ?? path,
    {
      baseUrl: init.baseUrl,
      parameters: init.parameters,
      body: init.body,
      headers: init.headers,
      parseAs: init.parseAs,
      method,
    },
  ];

  if (type === 'query') {
    return {
      queryKey: key,
      meta: { path, method, isAdmin: true },
      queryFn: (async ({ signal }: { signal: AbortSignal }) => {
        const { data } = await (client as any)[String(method).toUpperCase()](
          path,
          {
            baseUrl: init.baseUrl,
            signal,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...init.headers,
            },
            body: init.body,
            params: init.parameters,
            ...(init.parseAs && { parseAs: init.parseAs }),
          },
        );
        return data ?? null;
      }) as any,
      refetchOnMount: true,
    };
  } else {
    return {
      mutationKey: key,
      meta: { path, method, isAdmin: true },
      mutationFn: (async (variables: {
        parameters?: Parameters;
        body?: Body;
      }) => {
        const { data } = await (client as any)[String(method).toUpperCase()](
          path,
          {
            baseUrl: init.baseUrl,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...init.headers,
            },
            ...(init.parseAs && { parseAs: init.parseAs }),
            body: variables.body,
            params: variables.parameters,
          },
        );
        return data;
      }) as any,
    };
  }
}
