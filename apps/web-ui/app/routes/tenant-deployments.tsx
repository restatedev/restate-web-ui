import { Navigate, useParams } from 'react-router';

export default function Component() {
  const { scope = '' } = useParams<{ scope: string }>();
  return (
    <Navigate
      to={`/tenants/${encodeURIComponent(scope)}/overview?view=deployments`}
      replace
    />
  );
}
