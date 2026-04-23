/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { UnauthorizedError, RestateError } from '@restate/util/errors';
import { query } from '@restate/data-access/query';
import { getAuthToken, getRestateVersion } from '@restate/util/api-config';
import type { paths } from '@restate/data-access/admin-api-spec';
import { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import type {
  BodySerializer,
  FetchResponse,
  Middleware,
  ParseAs,
} from 'openapi-fetch';
import createClient from 'openapi-fetch';

function getHeader(
  headers: Headers | Record<string, unknown> | undefined,
  name: string,
) {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function getMediaType(headers: Headers | Record<string, unknown> | undefined) {
  return getHeader(headers, 'Content-Type')
    ?.split(';')
    .at(0)
    ?.trim()
    .toLowerCase();
}

const adminBodySerializer = ((body: unknown, headers?: Headers) => {
  const mediaType = getMediaType(headers);

  if (mediaType === 'application/octet-stream') {
    if (
      typeof body === 'string' ||
      ArrayBuffer.isView(body) ||
      body instanceof Blob
    ) {
      return body;
    }
  }

  if (
    mediaType === 'application/json' &&
    (ArrayBuffer.isView(body) || body instanceof Blob)
  ) {
    return body;
  }

  return JSON.stringify(body);
}) as BodySerializer<any>;

export const client = createClient<paths>({
  bodySerializer: adminBodySerializer,
  fetch: (input: Request) => {
    if (new URL(input.url).pathname.startsWith('/query/')) {
      return query(input);
    }
    return globalThis.fetch(input);
  },
});

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getAuthToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    const version = getRestateVersion();
    if (version) {
      request.headers.set('x-restate-version', version);
    }
    return request;
  },
};

const errorMiddleware: Middleware = {
  async onResponse({ response, request }) {
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
      if (typeof body === 'object' && body) {
        throw new RestateError(body.message, body.restate_code ?? '');
      }
      throw new Error(
        body || 'An unexpected error occurred. Please try again later.',
      );
    }
    if (response.ok && request.url.endsWith('health')) {
      return new Response(JSON.stringify({}), {
        ...response,
        headers: { ...response.headers, 'content-type': 'application/json' },
      });
    }
    return response;
  },
};

client.use(authMiddleware);
client.use(errorMiddleware);

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
            ...(init.parseAs
              ? { parseAs: init.parseAs }
              : path === '/health'
                ? { parseAs: 'stream' as const }
                : {}),
          },
        );
        return data;
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
