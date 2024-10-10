import { logs } from '@restate/features/cloud/logs-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(logs.clientLoader);
export const shouldRevalidate = logs.shouldRevalidate;
export default logs.Component;
