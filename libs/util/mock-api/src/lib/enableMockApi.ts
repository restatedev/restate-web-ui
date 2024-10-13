import { RequestHandler } from 'msw';
import { setupWorker } from 'msw/browser';
import Worker from 'msw/mockServiceWorker.js?url';

export async function enableMockApi(handlers: Array<RequestHandler>) {
  return await setupWorker(...handlers).start({
    serviceWorker: {
      url: Worker,
      options: {
        scope: '/',
      },
    },
    onUnhandledRequest: 'bypass',
  });
}
