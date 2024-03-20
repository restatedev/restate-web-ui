import { setupWorker } from 'msw/browser';
import Worker from 'msw/mockServiceWorker.js?url';
import { cloudApiHandlers } from './fixtures/cloudApiHandlers';

export async function enableMockApi() {
  return await setupWorker(...cloudApiHandlers).start({
    serviceWorker: {
      url: Worker,
      options: {
        scope: '/',
      },
    },
    onUnhandledRequest: 'bypass',
  });
}
