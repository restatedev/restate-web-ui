/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { UnauthorizedError } from '@restate/util/errors';
import type { paths } from './index'; // generated by openapi-typescript
import { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import type { FetchResponse, Middleware } from 'openapi-fetch';
import createClient from 'openapi-fetch';

class RestateError extends Error {
  constructor(message: string, public restate_code?: string) {
    super(message);
  }
}

const client = createClient<paths>({});
const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      if (response.status === 401) {
        // TODO: change import
        throw new UnauthorizedError();
      }
      const body:
        | string
        | {
            message: string;
            restate_code?: string | null;
          } = response.headers.get('content-type')?.includes('json')
        ? await response.clone().json()
        : await response.clone().text();

      if (typeof body === 'object') {
        throw new RestateError(body.message, body.restate_code ?? '');
      }
      throw new Error(body);
    }
    return response;
  },
};

client.use(errorMiddleware);

export type SupportedMethods<Path extends keyof paths> = keyof {
  [PossibleMethod in keyof paths[Path] as paths[Path][PossibleMethod] extends NonNullable<{
    parameters: {
      query?: unknown;
      header?: unknown;
      path?: unknown;
      cookie?: unknown;
    };
    requestBody?:
      | {
          content: {
            'application/json': unknown;
          };
        }
      | never;
  }>
    ? PossibleMethod
    : never]: paths[Path];
};

export type OperationParameters<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>
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
  Method extends SupportedMethods<Path>
> = paths[Path][Method] extends {
  requestBody: {
    content: {
      'application/json': unknown;
    };
  };
}
  ? paths[Path][Method]['requestBody']['content']['application/json']
  : never;

export type QueryOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>
> = UseQueryOptions<
  FetchResponse<paths[Path][Method], {}, 'application/json'>['data'],
  FetchResponse<paths[Path][Method], {}, 'application/json'>['error']
>;

type QueryFn<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>
> = Extract<QueryOptions<Path, Method>['queryFn'], Function>;

type QueryKey<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>
> = QueryOptions<Path, Method>['queryKey'];

export type MutationOptions<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
> = UseMutationOptions<
  FetchResponse<paths[Path][Method], {}, 'application/json'>['data'],
  FetchResponse<paths[Path][Method], {}, 'application/json'>['error'],
  {
    parameters?: Parameters;
    body?: Body;
  }
>;

type MutationFn<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
> = Extract<
  MutationOptions<Path, Method, Parameters, Body>['mutationFn'],
  Function
>;

type MutationKey<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
> = MutationOptions<Path, Method, Parameters, Body>['mutationKey'];

export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
>(
  type: 'query',
  path: Path,
  method: Method,
  init: {
    baseUrl: string;
    parameters?: Parameters;
    body?: Body;
  }
): {
  queryFn: QueryFn<Path, Method>;
  queryKey: QueryKey<Path, Method>;
  meta: Record<string, unknown>;
};
export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
>(
  type: 'mutate',
  path: Path,
  method: Method,
  init: {
    baseUrl: string;
    resolvedPath?: string;
  }
): {
  mutationFn: MutationFn<Path, Method, Parameters, Body>;
  mutationKey: MutationKey<Path, Method, Parameters, Body>;
  meta: Record<string, unknown>;
};
export function adminApi<
  Path extends keyof paths,
  Method extends SupportedMethods<Path>,
  Parameters extends OperationParameters<Path, Method>,
  Body extends OperationBody<Path, Method>
>(
  type: 'query' | 'mutate',
  path: Path,
  method: Method,
  init: {
    baseUrl: string;
    parameters?: Parameters;
    body?: Body;
    resolvedPath?: string;
  }
):
  | {
      queryFn: QueryFn<Path, Method>;
      queryKey: QueryKey<Path, Method>;
      meta: Record<string, unknown>;
    }
  | {
      mutationFn: MutationFn<Path, Method, Parameters, Body>;
      mutationKey: MutationKey<Path, Method, Parameters, Body>;
      meta: Record<string, unknown>;
    } {
  const key = [init.resolvedPath ?? path, { ...init, method }];

  if (type === 'query') {
    return {
      queryKey: key,
      meta: { path, method, isAdmin: true },
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const { data } = await (client as any)[String(method).toUpperCase()](
          path,
          {
            baseUrl: init.baseUrl,
            signal,
            headers: {
              Accept: 'json',
            },
            body: init.body,
            params: init.parameters,
            ...(path === '/health' && { parseAs: 'stream' }),
          }
        );
        return data;
      },
    };
  } else {
    return {
      mutationKey: key,
      meta: { path, method, isAdmin: true },
      mutationFn: async (variables: {
        parameters?: Parameters;
        body?: Body;
      }) => {
        const { data } = await (client as any)[String(method).toUpperCase()](
          path,
          {
            baseUrl: init.baseUrl,
            body: variables.body,
            params: variables.parameters,
          }
        );
        return data;
      },
    };
  }
}
