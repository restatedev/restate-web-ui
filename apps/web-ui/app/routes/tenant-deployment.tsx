import { TenantDeployment } from '@restate/features-tenant-view';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  { title: `Restate - Tenant deployment - ${params.deployment ?? ''}` },
];

export default function TenantDeploymentRoute() {
  const { scope = '' } = useParams<{ scope: string }>();
  return <TenantDeployment key={scope} scope={scope} />;
}
