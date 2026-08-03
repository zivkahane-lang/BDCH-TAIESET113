const CACHE_NAME = 'bdch-squadron-v1';
const CORE_ASSETS = [
  'index.html',
  'briefing.html',
  'trainings.html',
  'tests.html',
  'notes.html',
  'style.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/logo-source.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // וידאו וקבצי מצגת גדולים - תמיד מהרשת, לא מהמטמון
  if (event.request.url.match(/\.(mp4|pptx)$/)) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
