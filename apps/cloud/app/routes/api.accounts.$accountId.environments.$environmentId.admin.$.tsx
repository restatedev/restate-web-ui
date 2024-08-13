import { adminApi } from '@restate/features/admin-api';
import { withCookieAuth } from '@restate/util/auth';

export const loader = withCookieAuth(adminApi.loader);
