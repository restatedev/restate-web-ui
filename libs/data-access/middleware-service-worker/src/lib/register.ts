/// <reference types="vite/client" />
import workerUrl from './middleware?worker&url';

export async function register() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          if (navigator.serviceWorker.controller) {
            // Force update service worker if it exists
            return registration.update();
          } else {
            // This is the work around for hard reload
            // Unregister service worker that triggers a registration
            return registration.unregister();
          }
        })
      );

      await navigator.serviceWorker.register(workerUrl, {
        scope: '/',
        type: 'module',
      });

      await navigator.serviceWorker.ready;
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
}
