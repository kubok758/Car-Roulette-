/*
 * CAR ROULETTE — service worker для работы без сети.
 * Стратегия «сначала сеть»: онлайн всегда получаем свежие файлы,
 * без сети — последнюю сохранённую версию.
 */
const CACHE = 'car-roulette-v4';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/core.js',
  'assets/js/fx.js',
  'assets/js/app.js',
  'assets/data/cars.js',
  'assets/fonts/unbounded-latin.woff2',
  'assets/fonts/unbounded-cyrillic.woff2',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
