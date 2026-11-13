import { MAX_INVOCATION_ANCESTORS } from '@restate/data-access-admin-api-hooks';
import {
  EXPAND_INVOCATIONS_PARAM,
  FOCUS_INVOCATION_PARAM,
} from '@restate/features-invocation-ui';

const FOCUS_VIEWPORT_PADDING_RATIO = 0.1;
const FOCUS_VIEWPORT_MAX_RANGE_SHARE = 0.8;

export function getInitialInvocationIds(
  invocationId: string,
  searchParams: URLSearchParams,
) {
  return [
    ...new Set([
      invocationId,
      ...(searchParams.get(EXPAND_INVOCATIONS_PARAM)?.split(',') ?? []).filter(
        Boolean,
      ),
    ]),
  ].slice(0, MAX_INVOCATION_ANCESTORS + 1);
}

export function getFocusInvocationId(searchParams: URLSearchParams) {
  return searchParams.get(FOCUS_INVOCATION_PARAM) || undefined;
}

export function getFocusViewport({
  start,
  end,
  rangeStart,
  rangeEnd,
}: {
  start?: number;
  end?: number;
  rangeStart: number;
  rangeEnd: number;
}) {
  if (start === undefined || end === undefined || end <= start) {
    return undefined;
  }
  if (end - start >= (rangeEnd - rangeStart) * FOCUS_VIEWPORT_MAX_RANGE_SHARE) {
    return undefined;
  }
  const padding = (end - start) * FOCUS_VIEWPORT_PADDING_RATIO;
  return {
    start: Math.max(rangeStart, start - padding),
    end: Math.min(rangeEnd, end + padding),
  };
}
