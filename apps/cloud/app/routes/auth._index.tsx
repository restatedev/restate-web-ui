import { MetaFunction } from '@remix-run/react';
import { authenticate } from '@restate/util/auth';

export const clientLoader = authenticate;
export default () => null;
export const meta: MetaFunction = () => {
  return [{ title: 'Logging in… - restate Cloud' }];
};
