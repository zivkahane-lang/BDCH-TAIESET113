const CACHE_NAME = 'bdch-squadron-v2';
const SLIDES_CACHE = 'bdch-slides-v1';

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
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== SLIDES_CACHE)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // וידאו וקבצי מצגת גדולים (mp4/pptx) - תמיד מהרשת, לא נשמרים במטמון
  if (url.match(/\.(mp4|pptx)$/)) return;

  // שקפי הבד"ח (slide-XXX.jpg) והמניפסט שלהם -
  // נשמרים במטמון ייעודי בפעם הראשונה שהם נצפים, וזמינים אופליין מאז
  if (url.match(/slide-\d+\.jpg(\?.*)?$/) || url.match(/slides-manifest\.json$/)) {
    event.respondWith(
      caches.open(SLIDES_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached; // כבר נצפה בעבר - נטען מיד, גם בלי אינטרנט
          return fetch(event.request).then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached); // אם אין רשת ואין מטמון - נכשל בשקט
        })
      )
    );
    return;
  }

  // שאר הדף (HTML/CSS/אייקונים) - מהמטמון הראשי אם קיים, אחרת מהרשת
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
