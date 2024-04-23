import { environments } from '@restate/features/cloud/environments-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(environments.clientLoader);
export const clientAction = environments.clientAction;
export default environments.Component;
