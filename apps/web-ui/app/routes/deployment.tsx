import { deploymentRoute } from '@restate/features/deployment-route';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  { title: `Restate - Deployment - ${params.deployment ?? ''}` },
];

export default deploymentRoute.Component;
