const cacheName = 'osm-cache-v1';
const cacheAssets = [
    '/',         // Корневая страница (index.html)
    '/index.html', // Сам HTML файл
    // Здесь можно добавить другие статические ресурсы (скрипты, стили и т.д.), если они нужны оффлайн
];

// Кэшируем основные файлы при установке Service Worker
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log('Файлы кэшируются...');
            return cache.addAll(cacheAssets);
        }).then(() => {
            console.log('Все файлы закэшированы!');
            self.skipWaiting();
        })
    );
});

// Обслуживаем запросы через кэш
self.addEventListener('fetch', function(event) {
    // Кэшируем тайлы OSM и другие запросы
    if (event.request.url.startsWith('https://tile.openstreetmap.org')) {
        event.respondWith(
            caches.open(cacheName).then(function(cache) {
                return cache.match(event.request).then(function(response) {
                    // Возвращаем закэшированный ресурс, если он есть, или загружаем из сети
                    return response || fetch(event.request).then(function(networkResponse) {
                        // Кэшируем новый запрос
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    } else {
        // Для других запросов пробуем получить из кэша, если нет - загружаем из сети
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request);
            })
        );
    }
});

// Удаление старых кэшей при активации нового Service Worker
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(currentCacheName) {
                    if (currentCacheName !== cacheName) {
                        console.log('Удаляем старый кэш:', currentCacheName);
                        return caches.delete(currentCacheName);
                    }
                })
            );
        })
    );
});
