import { query } from '@restate/data-access/query';

const fetchHandler: ProxyHandler<typeof globalThis.fetch> = {
  apply: async function (target, thisArg, argumentsList) {
    const [resource, init] = argumentsList as [RequestInfo, RequestInit?];
    const url = typeof resource === 'string' ? resource : resource.url;
    const urlObject = new URL(url);
    if (urlObject.pathname.startsWith('/query/')) {
      const response = query(new Request(resource, init));
      if (response) {
        return response;
      }
    }

    return target.call(thisArg, resource, init);
  },
};

const originalFetch = globalThis.fetch;
export const queryFetcher = new Proxy(originalFetch, fetchHandler);
