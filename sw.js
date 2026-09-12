'use strict';
// Bump the version whenever cached static assets change. Never cache business data.
const CACHE_NAME = 'itsupp-install-v1';
const BASE = self.registration.scope;
const ASSETS = [
  'offline.html', 'pwa.css', 'pwa.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
].map(path => new URL(path, BASE).href);
const OFFLINE = new URL('offline.html', BASE).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  // Let an existing window finish its work before a new worker takes over.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('itsupp-install-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const base = new URL(BASE);
  // Leave API calls, auth callbacks with query parameters, and external CDNs alone.
  if (request.method !== 'GET' || url.origin !== base.origin || url.search || request.headers.has('Authorization')) return;
  if (request.mode === 'navigate' && [base.pathname, `${base.pathname}index.html`].includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      return (await caches.match(OFFLINE)) || new Response('Δεν υπάρχει σύνδεση στο Internet.', {
        status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    }));
    return;
  }
  if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
