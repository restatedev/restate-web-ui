import { serviceRoute } from '@restate/features/service-route';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  { title: `Restate - Service - ${params.service ?? ''}` },
];

export default serviceRoute.Component;
