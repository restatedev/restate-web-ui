import { settings } from '@restate/features/cloud/settings-route';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(settings.clientLoader);
export const clientAction = settings.clientAction;
export default settings.Component;
