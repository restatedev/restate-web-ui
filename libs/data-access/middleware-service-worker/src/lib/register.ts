/// <reference types="vite/client" />
import { queryFetcher } from './queryFetcher';
import workerUrl from './worker?worker&url';

export async function register() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          // Unregister service worker that triggers a registration
          // This will make sure always the updated worker gets registered
          // Also works with hard reload
          return registration.unregister();
        })
      );

      await navigator.serviceWorker.register(workerUrl, {
        scope: '/',
        type: 'module',
      });

      await navigator.serviceWorker.ready;
      return;
    } catch (error) {
      console.warn(`Registration failed with ${error}`);
    }
  } else {
    console.warn('Service Worker not available');
  }
  globalThis.queryFetch = queryFetcher;
}
