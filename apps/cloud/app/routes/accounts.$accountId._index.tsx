import { redirect } from '@remix-run/cloudflare';
import { withCookieAuth } from '@restate/util/auth';

export const loader = withCookieAuth(({ params }) =>
  redirect(`/accounts/${params.accountId}/environments`)
);
export default () => null;
