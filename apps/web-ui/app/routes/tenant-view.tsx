import { TenantView } from '@restate/features/tenant-view';
import { useParams } from 'react-router';

export default function TenantViewRoute() {
  const { scope = '', id } = useParams<{ scope: string; id: string }>();
  return <TenantView scope={scope} invocationId={id} />;
}

export function meta() {
  return [{ title: 'Restate - Tenant invocations' }];
}
