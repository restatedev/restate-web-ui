import { virtualObject } from '@restate/features/state-object-route';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = (args) => {
  return [{ title: `Restate - State - ${args.params.virtualObject}` }];
};
export default virtualObject.Component;
