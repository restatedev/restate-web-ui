import { MetaFunction } from '@remix-run/react';
import { authenticate } from '@restate/util/auth';

export const loader = authenticate;
export default () => null;
export const meta: MetaFunction = () => {
  return [{ title: 'Logging in… - Restate Cloud' }];
};
