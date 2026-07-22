import { virtualObjectInstance } from '@restate/features/virtual-objects-route';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  {
    title: `Restate - Virtual Object - ${params.service ?? ''} / ${params.key ?? ''}`,
  },
];

export default virtualObjectInstance.Component;
