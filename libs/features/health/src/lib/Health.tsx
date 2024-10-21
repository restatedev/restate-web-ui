import { useRestateContext } from '@restate/features/restate-context';

export function HealthCheck() {
  const { status } = useRestateContext();

  return null;
}
