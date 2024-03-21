import { RemixBrowser } from '@remix-run/react';
import { enableMockApi } from '@restate/util/mock-api';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

async function prepareApp() {
  if (process.env.NODE_ENV === 'development') {
    return await enableMockApi();
  }

  return Promise.resolve();
}

prepareApp().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
  });
});
