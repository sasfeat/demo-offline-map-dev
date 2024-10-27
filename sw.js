const cacheName = 'maptiler-raster-cache-v1';
const cacheAssets = [
    '/',
    '/index.html',
    '/libs/leaflet.css',
    '/libs/leaflet.js',
    '/images/marker-icon.png',
    '/images/marker-shadow.png',
    '/images/marker-icon-2x.png'
];
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            // Предварительное кэширование статических ресурсов
            return cache.addAll(cacheAssets);
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.url.includes('https://api.maptiler.com/maps/streets-v2/')) {
        // Перехват запросов к тайлам карты
        event.respondWith(
            caches.match(event.request).then(function(response) {
                if (response) {
                    // Если ресурс найден в кэше, вернуть его
                    return response;
                }

                // Если тайл не найден в кэше, запросить его из сети
                return fetch(event.request).then(function(networkResponse) {
                    // Если ответ успешен, добавить тайл в кэш
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(cacheName).then(function(cache) {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(function() {
                    // В случае отсутствия сети можно вернуть "заглушку" или уведомить пользователя
                    return new Response('Тайл не найден и нет доступа к сети.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    } else {
        // Обычная обработка для других запросов
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request);
            })
        );
    }
});
