import type {
  ClientLoaderFunction,
  ClientLoaderFunctionArgs,
} from '@remix-run/react';
import { getAccessToken, logOut, setAccessToken } from './accessToken';

const ACCESS_TOKEN_PARAM_NAME = 'access_token';

export function withAuth(loader: ClientLoaderFunction) {
  return async function (args: ClientLoaderFunctionArgs) {
    const url = new URL(args.request.url);
    const accessTokenFromURL = url.searchParams.get(ACCESS_TOKEN_PARAM_NAME);

    if (accessTokenFromURL) {
      setAccessToken(accessTokenFromURL);
    }

    if (!getAccessToken()) {
      logOut();
      return null;
    }

    return loader(args);
  };
}
