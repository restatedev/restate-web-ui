import { accounts } from '@restate/features/cloud/accounts-route';
import { CrashError } from '@restate/ui/error';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(accounts.clientLoader);
export const clientAction = accounts.clientAction;
export const ErrorBoundary = CrashError;
export default accounts.Component;
