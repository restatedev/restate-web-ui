import {
  redirect,
  type ClientLoaderFunction,
  type ClientLoaderFunctionArgs,
} from '@remix-run/react';
import { authWithAccessToken } from './authWithAccessToken';

export function withAuth(loader: ClientLoaderFunction) {
  return async function (args: ClientLoaderFunctionArgs) {
    const url = new URL(window.location.href);
    const redirectUrl = authWithAccessToken(url);
    console.log('redirectUrl', redirectUrl, args.request.url);
    if (redirectUrl) {
      return redirect(redirectUrl);
    }

    return loader(args);
  };
}
