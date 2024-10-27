// sw.js

const cacheName = 'maptiler-raster-cache-v5';
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
            return cache.addAll(cacheAssets).catch(function(error) {
                console.error('Ошибка кэширования при установке: ', error);
            });
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.url.includes('https://api.maptiler.com/maps/streets-v2/')) {
        event.respondWith(
            caches.match(event.request).then(function(response) {
                if (response) {
                    console.log(`Serving from cache: ${event.request.url}`);
                    return response;
                }

                return fetch(event.request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(cacheName).then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                        console.log(`Fetched from network and cached: ${event.request.url}`);
                        return networkResponse;
                    } else {
                        console.warn(`Failed to fetch from network: ${event.request.url}`);
                    }
                }).catch(function() {
                    console.warn(`Network unavailable and tile not cached: ${event.request.url}`);
                    return new Response('Тайл не найден и нет доступа к сети.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(function(response) {
                if (response) {
                    return response;
                }

                return fetch(event.request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(cacheName).then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                        return networkResponse;
                    } else {
                        return new Response('Resource not available offline.', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    }
                }).catch(function() {
                    return new Response('Resource not available offline.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    }
});

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
});
