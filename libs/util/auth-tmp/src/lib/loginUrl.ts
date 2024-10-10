import {
  RESTATE_AUTH_URL,
  RESTATE_AUTH_CLIENT_ID,
  RESTATE_AUTH_REDIRECT_URL,
} from './constants';

export function getLoginURL({ returnUrl }: { returnUrl?: string | null }) {
  return new URL(
    `${RESTATE_AUTH_URL}/login?client_id=${RESTATE_AUTH_CLIENT_ID}&response_type=code&redirect_uri=${RESTATE_AUTH_REDIRECT_URL}&state=${encodeURI(
      returnUrl ?? '/'
    )}`
  ).href;
}
