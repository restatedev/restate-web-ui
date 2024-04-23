import { apiKeys } from '@restate/features/cloud/api-keys-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(apiKeys.clientLoader);
export const clientAction = apiKeys.clientAction;
export default apiKeys.Component;
