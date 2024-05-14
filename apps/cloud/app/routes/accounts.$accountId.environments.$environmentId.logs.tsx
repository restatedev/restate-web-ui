import { logs } from '@restate/features/cloud/logs-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(logs.clientLoader);
export default logs.Component;
