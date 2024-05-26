/* eslint-disable @typescript-eslint/no-explicit-any */
import { FetchResponse } from 'openapi-fetch';

const hashTable = new WeakMap<object, string>();

function stableHash(params?: undefined | Record<string, any>) {
  if (params === undefined || params === null) {
    return '';
  }

  const storedHash = hashTable.get(params);
  if (storedHash !== undefined) {
    return storedHash;
  }

  const hash = JSON.stringify(params, (_, value) =>
    value.constructor === Object
      ? Object.keys(value)
          .sort()
          .reduce((result, key) => {
            result[key] = value[key];
            return result;
          }, {} as Record<string, any>)
      : value
  );
  hashTable.set(params, hash);
  return hash;
}

export function withCache<T, O, P extends undefined>(
  fetcher: (params?: undefined) => Promise<FetchResponse<T, O>>
): {
  invalidate: (params?: undefined) => void;
  isFetched: (params: P) => boolean;
  fetch: (params?: undefined) => Promise<FetchResponse<T, O>>;
};
export function withCache<T, O, P extends Record<string, any>>(
  fetcher: (params: P) => Promise<FetchResponse<T, O>>
): {
  invalidate: (params: P) => void;
  isFetched: (params: P) => boolean;
  fetch: (params: P) => Promise<FetchResponse<T, O>>;
};
export function withCache<T, O, P extends Record<string, any> | undefined>(
  fetcher: (params: P) => Promise<FetchResponse<T, O>>
) {
  const cache = new Map<string, Promise<FetchResponse<T, O>> | null>();

  return {
    invalidate: (params?: P) => {
      cache.delete(stableHash(params));
    },
    isFetched: (params?: P) => {
      return cache.has(stableHash(params));
    },
    fetch: (params: P) => {
      const paramsHash = stableHash(params);
      const cachedResponse = cache.get(paramsHash);
      if (cachedResponse) {
        return cachedResponse;
      }

      const promise = fetcher(params);
      cache.set(paramsHash, promise);
      promise
        .then((res) => {
          if (res.response.ok) {
            cache.set(paramsHash, Promise.resolve(res));
          } else {
            cache.set(paramsHash, null);
          }
        })
        .catch(() => {
          cache.set(paramsHash, null);
        });
      return promise;
    },
  };
}
