import { json } from '@remix-run/cloudflare';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { environment } from '@restate/features/cloud/environment-route';
import { withCookieAuth } from '@restate/util/auth';

export const loader = withCookieAuth(environment.loader);
