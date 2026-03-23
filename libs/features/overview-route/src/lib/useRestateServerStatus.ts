import { useEffect, useRef, useState } from 'react';
import type { FerrofluidStatus } from '@restate/ui/restate-server';

export function useRestateServerStatus({
  isHealthy,
  isError,
  isActive,
}: {
  isHealthy: boolean;
  isError: boolean;
  isActive: boolean;
}): FerrofluidStatus {
  const [status, setStatus] = useState<FerrofluidStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!isHealthy || isError) {
      setStatus('pause');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus('active');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setStatus((prev) => (prev !== 'pause' ? 'idle' : prev));
      timeoutRef.current = null;
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isHealthy, isError, isActive]);

  return status;
}
