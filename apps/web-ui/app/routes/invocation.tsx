import { invocation } from '@restate/features/invocation-route';
import { MetaFunction } from 'react-router';

export default invocation.Component;
export const meta: MetaFunction = (args) => {
  return [{ title: `Restate - Invocation - ${args.params.id}` }];
};
