import { MetaFunction } from '@remix-run/react';
import { logoutLoader } from '@restate/util/auth';

export const loader = logoutLoader;
export default () => null;
export const meta: MetaFunction = () => {
  return [{ title: 'Logging out… - Restate Cloud' }];
};
