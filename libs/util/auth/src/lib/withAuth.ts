import type {
  ClientLoaderFunction,
  ClientLoaderFunctionArgs,
} from '@remix-run/react';
import { getAccessToken, logOut, setAccessToken } from './accessToken';

const ACCESS_TOKEN_PARAM_NAME = 'access_token';

export function withAuth(loader: ClientLoaderFunction) {
  return async function (args: ClientLoaderFunctionArgs) {
    const url = new URL(window.location.href);
    const accessTokenFromURL = url.hash
      .split('#')
      .at(1)
      ?.split('&')
      .find((fragment) => fragment.startsWith(`${ACCESS_TOKEN_PARAM_NAME}=`))
      ?.split('=')
      .at(1);

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
