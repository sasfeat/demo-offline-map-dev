// sw.js

const cacheName = 'maptiler-raster-cache-v1';
const cacheAssets = [
    '/',                      // Главная страница
    '/index.html',            // HTML файл
    '/libs/leaflet.css',      // Локальная копия Leaflet CSS (если есть)
    '/libs/leaflet.js',       // Локальная копия Leaflet JS (если есть)
    '/images/marker-icon.png',
    '/images/marker-shadow.png',
    '/images/marker-icon-2x.png'
];

// Устанавливаем Service Worker и кэшируем ресурсы
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log('Кэшируем статические файлы...');
            return cache.addAll(cacheAssets).catch(function(error) {
                console.error('Ошибка кэширования при установке: ', error);
            });
        })
    );
    self.skipWaiting(); // Сразу активируем новый Service Worker
});

// Обрабатываем запросы через Service Worker
self.addEventListener('fetch', function(event) {
    // Проверяем запросы к расширениям Chrome
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) {
                console.log(`Serving from cache: ${event.request.url}`);
                return response;
            }

            // Если нет в кэше, загружаем из сети и добавляем в кэш
            return fetch(event.request)
                .then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        return caches.open(cacheName).then(function(cache) {
                            cache.put(event.request, networkResponse.clone());
                            console.log(`Fetched from network and cached: ${event.request.url}`);
                            return networkResponse;
                        });
                    } else {
                        console.warn(`Failed to fetch from network: ${event.request.url}`);
                        return networkResponse;
                    }
                })
                .catch(function(error) {
                    console.warn(`Network unavailable and resource not cached: ${event.request.url}`, error);
                    // Попробуем еще раз получить ресурс из кэша, если произошел сбой
                    return caches.match(event.request).then(function(cachedResponse) {
                        if (cachedResponse) {
                            return cachedResponse;
                        } else {
                            return new Response('Resource not available offline.', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        }
                    });
                });
        })
    );
});

// Очищаем старый кэш при активации нового Service Worker
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(existingCacheName) {
                    if (existingCacheName !== cacheName) {
                        console.log('Deleting old cache:', existingCacheName);
                        return caches.delete(existingCacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Активируем новый Service Worker на всех страницах
});
