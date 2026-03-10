import { useEffect, useRef, useState } from 'react';

export function usePresentedRangeEnd({
  actualEndMs,
  authoritativeNowMs,
  shouldAdvance,
}: {
  actualEndMs: number;
  authoritativeNowMs: number;
  shouldAdvance: boolean;
}): {
  rangeEndMs: number;
  nowMs: number;
} {
  const [presentationHeadroomMs, setPresentationHeadroomMs] = useState(0);
  const lastAuthoritativeNowMsRef = useRef(authoritativeNowMs);
  const lastAuthoritativeWallClockMsRef = useRef<number | null>(null);
  const presentedRangeEndMsRef = useRef(Math.max(actualEndMs, authoritativeNowMs));

  useEffect(() => {
    if (!shouldAdvance) {
      setPresentationHeadroomMs(0);
      lastAuthoritativeNowMsRef.current = authoritativeNowMs;
      lastAuthoritativeWallClockMsRef.current = null;
      presentedRangeEndMsRef.current = Math.max(actualEndMs, authoritativeNowMs);
      return;
    }

    const wallClockNowMs = Date.now();
    if (authoritativeNowMs !== lastAuthoritativeNowMsRef.current) {
      lastAuthoritativeNowMsRef.current = authoritativeNowMs;
      lastAuthoritativeWallClockMsRef.current = wallClockNowMs;
      setPresentationHeadroomMs(0);
      return;
    }

    if (lastAuthoritativeWallClockMsRef.current === null) {
      lastAuthoritativeWallClockMsRef.current = wallClockNowMs;
      setPresentationHeadroomMs(0);
    }
  }, [shouldAdvance, actualEndMs, authoritativeNowMs]);

  useEffect(() => {
    if (!shouldAdvance) {
      return;
    }

    let frame = 0;
    const tick = () => {
      setPresentationHeadroomMs((currentHeadroomMs) => {
        const anchorWallClockMs = lastAuthoritativeWallClockMsRef.current;
        if (anchorWallClockMs === null) {
          return currentHeadroomMs;
        }
        const nextHeadroomMs = Math.max(0, Date.now() - anchorWallClockMs);
        return nextHeadroomMs === currentHeadroomMs
          ? currentHeadroomMs
          : nextHeadroomMs;
      });
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [shouldAdvance, authoritativeNowMs]);

  const nowMs = shouldAdvance ? authoritativeNowMs : actualEndMs;
  const baseRangeEndMs = shouldAdvance ? Math.max(actualEndMs, nowMs) : actualEndMs;
  const candidateRangeEndMs = shouldAdvance
    ? baseRangeEndMs + presentationHeadroomMs
    : baseRangeEndMs;
  const rangeEndMs = shouldAdvance
    ? Math.max(candidateRangeEndMs, presentedRangeEndMsRef.current)
    : candidateRangeEndMs;
  presentedRangeEndMsRef.current = rangeEndMs;

  return {
    rangeEndMs,
    nowMs,
  };
}
