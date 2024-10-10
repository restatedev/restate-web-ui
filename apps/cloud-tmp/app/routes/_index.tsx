import { redirect } from '@remix-run/cloudflare';
import { withCookieAuth } from '@restate/util/auth';

export const loader = withCookieAuth(() => redirect('/accounts'));
export default () => null;
