import { useRestateContext } from '@restate/features/restate-context';
import { showWarningNotification } from '@restate/ui/notification';
import { useEffect } from 'react';

export function useHealthCheckNotification(props?: { message?: string }) {
  const { status, healthFailure } = useRestateContext();
  const isDegraded = status === 'DEGRADED';
  const isUnreachable = status === 'UNREACHABLE';
  const kind = healthFailure?.kind;
  const isOffline =
    healthFailure?.kind === 'unreachable' && healthFailure.offline;

  useEffect(() => {
    if (!isDegraded && !isUnreachable) {
      return;
    }
    const message =
      props?.message ??
      (kind === 'unreachable'
        ? isOffline
          ? 'You appear to be offline. Reconnect to access your Restate server.'
          : 'Cannot reach your Restate server. This could be a network issue on your end — check your connection and that the server is running.'
        : kind === 'unauthorized'
          ? 'Authentication with your Restate server failed.'
          : 'Your Restate server is currently experiencing issues.');
    const notification = showWarningNotification(message);

    return () => {
      notification.hide();
    };
  }, [isDegraded, isUnreachable, kind, isOffline, props?.message]);
}
