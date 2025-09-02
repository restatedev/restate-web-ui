import { useRestateContext } from '@restate/features/restate-context';
import { showWarningNotification } from '@restate/ui/notification';
import { useEffect } from 'react';

export function useHealthCheckNotification(props?: { message?: string }) {
  const { status } = useRestateContext();
  const isDegraded = status === 'DEGRADED';

  useEffect(() => {
    let hide: VoidFunction | undefined = undefined;
    if (isDegraded) {
      const notification = showWarningNotification(
        props?.message ??
          'Your Restate server is currently experiencing issues.',
      );
      hide = notification.hide;
    }

    return () => {
      hide?.();
    };
  }, [isDegraded, props?.message]);
}
