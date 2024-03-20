import { setupWorker } from 'msw/browser';
import { cloudApiHandlers } from './handlers/cloudApiHandlers';
import Worker from 'msw/mockServiceWorker.js?url';

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
