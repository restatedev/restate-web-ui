import { workflowRun } from '@restate/features/workflows-route';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  {
    title: `Restate - Workflow - ${params.service ?? ''} / ${params.workflowId ?? ''}`,
  },
];

export default workflowRun.Component;
