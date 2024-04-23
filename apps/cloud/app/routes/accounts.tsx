import { accounts } from '@restate/features/cloud/accounts-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(accounts.clientLoader);
export const clientAction = accounts.clientAction;
export default accounts.Component;
