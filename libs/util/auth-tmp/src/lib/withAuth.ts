import { redirect, type ClientLoaderFunction } from '@remix-run/react';
import type {
  LoaderFunction,
  LoaderFunctionArgs,
  TypedResponse,
} from '@remix-run/cloudflare';
import { getAuthCookie } from './authCookie';
import { getLoginURL } from './loginUrl';
import { setAccessToken } from './accessToken';
import ky from 'ky';
import { UnauthorizedError } from './UnauthorizedError';

let cachedTokenPromise: Promise<{ accessToken: string }> | null = null;

export function withAuth<L extends ClientLoaderFunction>(
  loader: L
): (...args: Parameters<L>) => Promise<ReturnType<L> | TypedResponse<never>> {
  return async function (...args: Parameters<L>) {
    const url = new URL(window.location.href);

    cachedTokenPromise =
      cachedTokenPromise ?? ky.get('/api/auth').json<{ accessToken: string }>();
    // TODO: remove saving token in local storage
    const accessToken = (await cachedTokenPromise).accessToken;

    if (accessToken) {
      setAccessToken(accessToken);
      try {
        return await (loader(args[0]) as ReturnType<L>);
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
