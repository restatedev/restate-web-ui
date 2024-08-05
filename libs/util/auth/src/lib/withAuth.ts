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
          'application/json': {};
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
          RESTATE_AUTH_CLIENT_ID: process.env.RESTATE_AUTH_CLIENT_ID,
          RESTATE_AUTH_URL: process.env.RESTATE_AUTH_URL,
          RESTATE_AUTH_REDIRECT_URL: process.env.RESTATE_AUTH_REDIRECT_URL,
        })
      );
    }
  };
}

export function withCookieAuth(loader: LoaderFunction) {
  return async function (args: LoaderFunctionArgs) {
    const authCookie = await getAuthCookie(args.request);
    const url = new URL(args.request.url);

    // If there is no cookie, redirect to login
    if (!authCookie) {
      return redirect(
        getLoginURL({
          ...args.context.cloudflare.env,
          returnUrl: `${url.pathname}${url.search}`,
        })
      );
    }

    return loader(args);
  };
}
