const CACHE_NAME = 'bdch-squadron-v3';
const SLIDES_CACHE = 'bdch-slides-v1';

const CORE_ASSETS = [
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

  // מניפסט הקישורים (slides-manifest.json) - יכול להשתנות (כמו עכשיו, כשמתקנים
  // קישור), אז תמיד בודקים מול הרשת קודם, ורק נופלים למטמון אם אין בכלל רשת
  if (url.match(/slides-manifest\.json$/)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          caches.open(SLIDES_CACHE).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.open(SLIDES_CACHE).then(cache => cache.match(event.request)))
    );
    return;
  }

  // תמונות השקפים עצמן (slide-XXX.jpg) - אלה לא משתנות אחרי שנוצרו,
  // אז נשמרות במטמון ייעודי בפעם הראשונה שהן נצפות, וזמינות אופליין מאז
  if (url.match(/slide-\d+\.jpg(\?.*)?$/)) {
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

  // כל שאר הדף (HTML/CSS) - תמיד מנסים רשת קודם, כדי שעדכונים יתפסו מיד.
  // רק אם באמת אין רשת בכלל, נופלים חזרה לגרסה האחרונה השמורה (אם קיימת).
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
