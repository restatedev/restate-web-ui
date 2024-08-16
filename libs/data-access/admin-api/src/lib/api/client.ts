import { UnauthorizedError } from '@restate/data-access/cloud/api-client';
import type { paths } from './index'; // generated by openapi-typescript
import { UseQueryOptions } from '@tanstack/react-query';
import type { FetchResponse, Middleware } from 'openapi-fetch';
import createClient from 'openapi-fetch';

const client = createClient<paths>({});
const errorMiddleware: Middleware = {
  async onRequest({ request, options }) {
    const baseUrl = request.headers.get('baseUrl');
    if (baseUrl) {
      const { url, headers, ...requestInit } = request;
      const _url = new URL(url);
      headers.delete('baseUrl');
      return new Request(`${baseUrl}${_url.pathname}${_url.search}`, {
        ...requestInit,
        headers: headers,
      });
    }

    return request;
  },
  async onResponse({ response }) {
    if (!response.ok) {
      if (response.status === 401) {
        // TODO: change import
        throw new UnauthorizedError();
      }
      const body: string = response.headers
        .get('content-type')
        ?.includes('json')
        ? await response.clone().json()
        : await response.clone().text();
      throw new Error(body);
    }
    return response;
  },
};

client.use(errorMiddleware);

export function adminApi<
  Path extends keyof paths,
  Method extends keyof {
    [PossibleMethod in keyof paths[Path] as paths[Path][PossibleMethod] extends NonNullable<{
      parameters: unknown;
    }>
      ? PossibleMethod
      : never]: paths[Path];
  }
>(
  path: Path,
  method: Method,
  baseUrl: string
): {
  queryFn: Extract<
    UseQueryOptions<
      FetchResponse<paths[Path][Method], {}, 'application/json'>['data'],
      FetchResponse<paths[Path][Method], {}, 'application/json'>['error']
    >['queryFn'],
    Function
  >;
  queryKey: UseQueryOptions<
    FetchResponse<paths[Path][Method], {}, 'application/json'>['data'],
    FetchResponse<paths[Path][Method], {}, 'application/json'>['error']
  >['queryKey'];
} {
  return {
    queryKey: [`${baseUrl}${path}`],
    queryFn: async ({ signal }) => {
      const { data } = await (client as any)[String(method).toUpperCase()](
        path,
        {
          signal,
          headers: {
            baseUrl,
          },
        }
      );
      return data;
    },
  };
}