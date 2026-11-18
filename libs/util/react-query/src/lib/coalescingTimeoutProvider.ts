import type {
  ManagedTimerId,
  TimeoutCallback,
  TimeoutProvider,
} from '@tanstack/react-query';

export const TIMEOUT_BUCKET_MS = 1000;

type Bucket = {
  timer: ReturnType<typeof setTimeout>;
  callbacks: Map<number, TimeoutCallback>;
};

const buckets = new Map<number, Bucket>();
const bucketByTimeoutId = new Map<number, number>();
let lastTimeoutId = 0;

function runBucket(at: number) {
  const bucket = buckets.get(at);
  if (!bucket) {
    return;
  }
  buckets.delete(at);
  for (const [timeoutId, callback] of bucket.callbacks) {
    bucketByTimeoutId.delete(timeoutId);
    try {
      callback();
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}

function isCoalescedTimeoutId(
  timeoutId: ManagedTimerId | undefined,
): timeoutId is number {
  return typeof timeoutId === 'number' && timeoutId < 0;
}

export const coalescingTimeoutProvider: TimeoutProvider = {
  setTimeout: (callback, delay) => {
    if (!(delay >= TIMEOUT_BUCKET_MS)) {
      return setTimeout(callback, delay) as ManagedTimerId;
    }
    const now = Date.now();
    const at = Math.ceil((now + delay) / TIMEOUT_BUCKET_MS) * TIMEOUT_BUCKET_MS;
    let bucket = buckets.get(at);
    if (!bucket) {
      bucket = {
        timer: setTimeout(() => runBucket(at), at - now),
        callbacks: new Map(),
      };
      buckets.set(at, bucket);
    }
    const timeoutId = --lastTimeoutId;
    bucket.callbacks.set(timeoutId, callback);
    bucketByTimeoutId.set(timeoutId, at);
    return timeoutId;
  },
  clearTimeout: (timeoutId) => {
    if (!isCoalescedTimeoutId(timeoutId)) {
      clearTimeout(timeoutId as Parameters<typeof clearTimeout>[0]);
      return;
    }
    const at = bucketByTimeoutId.get(timeoutId);
    if (at === undefined) {
      return;
    }
    bucketByTimeoutId.delete(timeoutId);
    const bucket = buckets.get(at);
    if (!bucket) {
      return;
    }
    bucket.callbacks.delete(timeoutId);
    if (bucket.callbacks.size === 0) {
      clearTimeout(bucket.timer);
      buckets.delete(at);
    }
  },
  setInterval: (callback, delay) =>
    setInterval(callback, delay) as ManagedTimerId,
  clearInterval: (intervalId) =>
    clearInterval(intervalId as Parameters<typeof clearInterval>[0]),
};
