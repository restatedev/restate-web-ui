import { virtualObject } from '@restate/features/state-object-route';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = (args) => {
  return [{ title: `Restate - Virtual Object - ${args.params.virtualObject}` }];
};
export default virtualObject.Component;
