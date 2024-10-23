const cacheName = 'maptiler-raster-cache-v1';
const cacheAssets = [
    '/',                      // Главная страница
    '/index.html',             // HTML файл
    '/libs/leaflet.css',       // Локальная копия Leaflet CSS (если есть)
    '/libs/leaflet.js',        // Локальная копия Leaflet JS (если есть)
    '/images/marker-icon.png'
];

// Устанавливаем Service Worker и кэшируем ресурсы
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName)
            .then(function(cache) {
                console.log('Кэшируем статические файлы...');
                return cache.addAll(cacheAssets);
            })
            .then(() => self.skipWaiting()) // Сразу активировать новый SW
            .catch(function(error) {
                console.error('Ошибка кэширования при установке:', error);
            })
    );
});

// Обрабатываем запросы через кэш
self.addEventListener('fetch', function(event) {
    // Исключаем запросы к расширениям Chrome
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // Кэшируем запросы к тайлам
    if (event.request.url.startsWith('https://api.maptiler.com/maps/streets-v2/')) {
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request).then(function(fetchResponse) {
                    return caches.open(cacheName).then(function(cache) {
                        cache.put(event.request, fetchResponse.clone()); // Кэшируем растровые тайлы
                        return fetchResponse;
                    });
                }).catch(function() {
                    // Можно вернуть какую-либо заглушку, если оффлайн и нет тайлов
                    return caches.match('/fallback-tile.png');
                });
            })
        );
    } else {
        // Обрабатываем другие запросы
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request).then(function(fetchResponse) {
                    return caches.open(cacheName).then(function(cache) {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                }).catch(function() {
                    return caches.match('/index.html'); // Возвращаем оффлайн-страницу
                });
            })
        );
    }
});

// Очищаем старый кэш при активации нового Service Worker
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
