import { TenantService } from '@restate/features-tenant-view';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const meta: MetaFunction = ({ params }) => [
  { title: `Restate - Tenant service - ${params.service ?? ''}` },
];

export default function TenantServiceRoute() {
  const { scope = '' } = useParams<{ scope: string }>();
  return <TenantService key={scope} scope={scope} />;
}
