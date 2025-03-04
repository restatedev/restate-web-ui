import { introspection } from '@restate/features/introspection-route';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => {
  return [{ title: `Restate - Introspection` }];
};
export default introspection.Component;
