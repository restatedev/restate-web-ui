import {
  type RefObject,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DEFAULT_NOW_PIN_PROXIMITY_THRESHOLD_MS } from './nowMarker';

const MAX_PRESENTATION_HEADROOM_MS = 2_000;

export function getHeadroomStepMs(
  visibleWindowDurationMs: number,
  containerWidthPx: number,
) {
  return containerWidthPx > 0
    ? visibleWindowDurationMs / containerWidthPx / 2
    : Infinity;
}

export function getPresentationHeadroomMs(elapsedMs: number, stepMs: number) {
  const headroomMs = Math.min(
    MAX_PRESENTATION_HEADROOM_MS,
    Math.max(0, elapsedMs),
  );
  if (!(stepMs > 0)) {
    return headroomMs;
  }
  if (!Number.isFinite(stepMs)) {
    return 0;
  }
  const steppedHeadroomMs =
    stepMs > headroomMs ? 0 : Math.floor(headroomMs / stepMs) * stepMs;
  return headroomMs > DEFAULT_NOW_PIN_PROXIMITY_THRESHOLD_MS
    ? Math.max(steppedHeadroomMs, DEFAULT_NOW_PIN_PROXIMITY_THRESHOLD_MS + 1)
    : steppedHeadroomMs;
}

export function usePresentedRangeEnd({
  actualEndMs,
  authoritativeNowMs,
  shouldAdvance,
  headroomStepMsRef,
}: {
  actualEndMs: number;
  authoritativeNowMs: number;
  shouldAdvance: boolean;
  headroomStepMsRef: RefObject<number>;
}): {
  rangeEndMs: number;
  nowMs: number;
} {
  const [presentationHeadroomMs, setPresentationHeadroomMs] = useState(0);
  const presentationHeadroomMsRef = useRef(0);
  const lastAuthoritativeNowMsRef = useRef(authoritativeNowMs);
  const lastAuthoritativeWallClockMsRef = useRef<number | null>(null);
  const presentedRangeEndMsRef = useRef(
    Math.max(actualEndMs, authoritativeNowMs),
  );

  useEffect(() => {
    if (!shouldAdvance) {
      presentationHeadroomMsRef.current = 0;
      setPresentationHeadroomMs(0);
      lastAuthoritativeNowMsRef.current = authoritativeNowMs;
      lastAuthoritativeWallClockMsRef.current = null;
      presentedRangeEndMsRef.current = Math.max(
        actualEndMs,
        authoritativeNowMs,
      );
      return;
    }

    const wallClockNowMs = Date.now();
    if (authoritativeNowMs !== lastAuthoritativeNowMsRef.current) {
      lastAuthoritativeNowMsRef.current = authoritativeNowMs;
      lastAuthoritativeWallClockMsRef.current = wallClockNowMs;
      presentationHeadroomMsRef.current = 0;
      setPresentationHeadroomMs(0);
      return;
    }

    if (lastAuthoritativeWallClockMsRef.current === null) {
      lastAuthoritativeWallClockMsRef.current = wallClockNowMs;
      presentationHeadroomMsRef.current = 0;
      setPresentationHeadroomMs(0);
    }
  }, [shouldAdvance, actualEndMs, authoritativeNowMs]);

  useEffect(() => {
    if (!shouldAdvance) {
      return;
    }

    let frame = 0;
    const tick = () => {
      const anchorWallClockMs = lastAuthoritativeWallClockMsRef.current;
      if (anchorWallClockMs !== null) {
        const nextHeadroomMs = getPresentationHeadroomMs(
          Date.now() - anchorWallClockMs,
          headroomStepMsRef.current,
        );
        if (nextHeadroomMs !== presentationHeadroomMsRef.current) {
          presentationHeadroomMsRef.current = nextHeadroomMs;
          startTransition(() => {
            setPresentationHeadroomMs(nextHeadroomMs);
          });
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [shouldAdvance, authoritativeNowMs, headroomStepMsRef]);

  const baseRangeEndMs = shouldAdvance
    ? Math.max(actualEndMs, authoritativeNowMs)
    : actualEndMs;
  const candidateRangeEndMs = shouldAdvance
    ? baseRangeEndMs + presentationHeadroomMs
    : baseRangeEndMs;
  const rangeEndMs = shouldAdvance
    ? Math.max(candidateRangeEndMs, presentedRangeEndMsRef.current)
    : candidateRangeEndMs;
  presentedRangeEndMsRef.current = rangeEndMs;

  const nowMs = shouldAdvance ? authoritativeNowMs : actualEndMs;

  return {
    rangeEndMs,
    nowMs,
  };
}
