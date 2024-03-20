import { setupWorker } from 'msw/browser';
import Worker from './mockServiceWorker/mockServiceWorker.js?url';
import { cloudApiHandlers } from './cloudApiHandlers';

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
