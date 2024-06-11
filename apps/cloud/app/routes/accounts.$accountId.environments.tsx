import { environments } from '@restate/features/cloud/environments-route';
import { CrashError } from '@restate/ui/error';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(environments.clientLoader);
export const clientAction = environments.clientAction;
export const ErrorBoundary = CrashError;
export default environments.Component;
