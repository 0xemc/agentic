import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// SW version — bump this to force browsers to install the updated worker.
const SW_VERSION = "1.1.0";
console.log(`[SW] Version ${SW_VERSION} activated`);

// API routes (especially SSE streaming endpoints) must bypass the service
// worker entirely. Serwist's caching strategies cannot handle streaming
// responses — intercepting them causes onerror on the client side.
// Register this BEFORE serwist.addEventListeners() so it takes priority.
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
  }
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
