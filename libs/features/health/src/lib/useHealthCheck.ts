import { useRestateContext } from '@restate/features-restate-context';
import { showWarningNotification } from '@restate/ui-notification';
import { getHealthFailureMessage } from '@restate/util-errors';
import { useEffect } from 'react';

export function useHealthCheckNotification(props?: { message?: string }) {
  const { status, healthFailure } = useRestateContext();
  const isDegraded = status === 'DEGRADED';
  const isUnreachable = status === 'UNREACHABLE';
  const message =
    props?.message ??
    (healthFailure
      ? getHealthFailureMessage(healthFailure)
      : 'Your Restate server is currently experiencing issues.');

  useEffect(() => {
    if (!isDegraded && !isUnreachable) {
      return;
    }
    const notification = showWarningNotification(message);

    return () => {
      notification.hide();
    };
  }, [isDegraded, isUnreachable, message]);
}
