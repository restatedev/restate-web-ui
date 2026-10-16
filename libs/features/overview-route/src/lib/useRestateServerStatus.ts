import { useState, useEffect, useRef } from 'react';
import type { FerrofluidStatus } from '@restate/ui/restate-server';

export function useRestateServerStatus({
  isHealthy,
  isError,
  isActive,
  issueSeverity,
}: {
  isHealthy: boolean;
  isError: boolean;
  isActive: boolean;
  issueSeverity?: 'high' | 'low' | 'none';
}): FerrofluidStatus {
  const [debouncedIdle, setDebouncedIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isIdle =
    isHealthy &&
    !isError &&
    !isActive &&
    issueSeverity !== 'high' &&
    issueSeverity !== 'low';

  useEffect(() => {
    if (isIdle) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedIdle(true);
        timeoutRef.current = null;
      }, 2000);
    } else {
      setDebouncedIdle(false);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isIdle]);

  if (!isHealthy || isError || issueSeverity === 'high') return 'danger';
  if (issueSeverity === 'low') return 'warning';
  if (isActive) return 'active';
  return debouncedIdle ? 'idle' : 'active';
}
