import { redirect } from '@remix-run/react';
import { withCookieAuth } from '@restate/util/auth';

export const loader = withCookieAuth(() => redirect('./settings'));
export default () => null;
