import { RemixBrowser } from '@remix-run/react';
import { enableMock } from '@restate/data-access/mock-cloud-api';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

async function prepareApp() {
  if (process.env.NODE_ENV === 'development') {
    return await enableMock();
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
