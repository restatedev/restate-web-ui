import {
  redirect,
  type ClientLoaderFunction,
  type ClientLoaderFunctionArgs,
} from '@remix-run/react';
import type { LoaderFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getAuthCookie } from './authCookie';
import { getLoginURL } from './loginUrl';
import { setAccessToken } from './accessToken';
import { withCache } from '@restate/util/cache';
import { UnauthorizedError } from '@restate/data-access/cloud/api-client';

const getTokenWithCache = withCache<
  {
    responses: {
      200: {
        content: {
          'application/json': { accessToken: string };
        };
      };
      401: {
        content: {
          'application/json': object;
        };
      };
    };
  },
  undefined,
  undefined
>(() =>
  fetch('/api/auth').then(async (response) => ({
    response,
    data: (await response.json()) as { accessToken: string },
  }))
);

export function withAuth(loader: ClientLoaderFunction) {
  return async function (args: ClientLoaderFunctionArgs) {
    const url = new URL(window.location.href);

    // TODO: remove saving token in local storage
    const { data } = await getTokenWithCache.fetch();
    if (data) {
      setAccessToken(data.accessToken);
      return loader(args);
    } else {
      return redirect(
        getLoginURL({
          returnUrl: `${url.pathname}${url.search}`,
        })
      );
    }
  };
}

export type LoaderFunctionArgsWithAuth = LoaderFunctionArgs & {
  authToken: string;
};
export function withCookieAuth(
  loader: (args: LoaderFunctionArgsWithAuth) => ReturnType<LoaderFunction>
) {
  return async function (args: LoaderFunctionArgs) {
    const authToken = await getAuthCookie(args.request);
    const url = new URL(args.request.url);

    // If there is no cookie, redirect to login
    if (!authToken) {
      return redirect(
        getLoginURL({
          returnUrl: `${url.pathname}${url.search}`,
        })
      );
    }

    try {
      return await loader({ ...args, authToken });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return redirect(
          getLoginURL({
            returnUrl: `${url.pathname}${url.search}`,
          })
        );
      }
      throw error;
    }
  };
}
