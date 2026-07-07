// Service worker — кэширует файлы, чтобы приложение работало офлайн.
// Версию кэша меняем при каждом релизе, чтобы обновления доезжали до пользователей.
const CACHE = 'finance-v2';
const ASSETS = [
  './',
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

// Стратегия «stale-while-revalidate»: отдаём из кэша сразу (быстро и работает офлайн),
// а в фоне тянем свежую версию и обновляем кэш к следующему открытию.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    const result = cached || await network;
    if (result) return result;
    // Офлайн и файла нет в кэше: для навигации отдаём главную страницу приложения
    if (req.mode === 'navigate') {
      return (await cache.match('index.html')) || Response.error();
    }
    return Response.error();
  })());
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
