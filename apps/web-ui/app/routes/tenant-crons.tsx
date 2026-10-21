import { TenantCrons } from '@restate/features-tenant-view';
import { useParams } from 'react-router';

export default function TenantCronsRoute() {
  const { scope = '' } = useParams<{ scope: string }>();
  return <TenantCrons key={scope} scope={scope} />;
}

export function meta() {
  return [{ title: 'Restate - Tenant crons' }];
}
