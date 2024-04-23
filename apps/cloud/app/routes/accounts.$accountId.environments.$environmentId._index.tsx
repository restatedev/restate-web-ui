import { redirect } from '@remix-run/react';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(() => redirect('./apiKeys'));
export default () => null;
