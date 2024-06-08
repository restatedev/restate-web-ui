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
    value?.constructor === Object
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
  fetcher: (
    params?: undefined,
    options?: Pick<RequestInit, 'signal' | 'mode'>
  ) => Promise<FetchResponse<T, O, 'application/json'>>
): {
  invalidate: (params?: undefined) => void;
  fetch: (
    params?: undefined,
    options?: Pick<RequestInit, 'signal' | 'mode'>
  ) => Promise<FetchResponse<T, O, 'application/json'>>;
};
export function withCache<T, O, P extends Record<string, any>>(
  fetcher: (
    params: P,
    options?: Pick<RequestInit, 'signal' | 'mode'>
  ) => Promise<FetchResponse<T, O, 'application/json'>>
): {
  invalidate: (params: P) => void;
  fetch: (
    params: P,
    options?: Pick<RequestInit, 'signal' | 'mode'>
  ) => Promise<FetchResponse<T, O, 'application/json'>>;
};
export function withCache<T, O, P extends Record<string, any> | undefined>(
  fetcher: (
    params: P,
    options?: Pick<RequestInit, 'signal' | 'mode'>
  ) => Promise<FetchResponse<T, O, 'application/json'>>
) {
  const cache = new Map<
    string,
    Promise<FetchResponse<T, O, 'application/json'>> | null
  >();

  return {
    invalidate: (params?: P) => {
      cache.delete(stableHash(params));
    },
    fetch: (params: P, options?: Pick<RequestInit, 'signal' | 'mode'>) => {
      const paramsHash = stableHash(params);
      const cachedResponse = cache.get(paramsHash);

      if (cachedResponse) {
        return cachedResponse;
      }

      const promise = fetcher(params, options);
      cache.set(paramsHash, promise);
      promise
        .then((res) => {
          if (res.response.ok) {
            cache.set(paramsHash, Promise.resolve(res));
          } else {
            cache.delete(paramsHash);
          }
        })
        .catch(() => {
          cache.delete(paramsHash);
        });
      return promise;
    },
  };
}
