import { Navigate } from 'react-router';

export default function Component() {
  return <Navigate to="/overview?view=deployments" replace />;
}
