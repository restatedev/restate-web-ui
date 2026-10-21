import { TenantOverview } from '@restate/features-tenant-view';
import { useParams } from 'react-router';

export default function TenantOverviewRoute() {
  const { scope = '' } = useParams<{ scope: string }>();
  return <TenantOverview key={scope} scope={scope} />;
}

export function meta() {
  return [{ title: 'Restate - Tenant services and deployments' }];
}
