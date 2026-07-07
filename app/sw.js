// Service worker — кэширует файлы, чтобы приложение работало офлайн.
const CACHE = 'finance-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// При установке — складываем файлы в кэш
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// При запросе — сначала пробуем кэш, потом сеть
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});

// Чистим старые версии кэша при обновлении
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
