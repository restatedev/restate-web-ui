/// <reference lib="WebWorker" />
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

self.addEventListener('fetch', (event) => {
  // You can intercept network requests here
  if (event.request.url.endsWith('/deployments')) {
    const r = new Response(JSON.stringify({ deployments: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    event.respondWith(r);
  }
});
