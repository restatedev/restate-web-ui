/// <reference lib="WebWorker" />
import { query } from '@restate/data-access/query';

export type {};
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Make sure we wait until service worker is active
  event.waitUntil(self.clients.claim());
  // You can clean up old caches here
});

self.addEventListener('fetch', async (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/query/')) {
    const response = query(event.request);
    if (response) {
      event.respondWith(response);
    }
  }
});
