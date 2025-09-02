import { useHealthCheckNotification } from './useHealthCheck';

export function HealthCheckNotification({ message }: { message?: string }) {
  useHealthCheckNotification({ message });

  return null;
}
