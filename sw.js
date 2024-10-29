const isGithubPages = window.location.hostname.includes('github.io');
const isSkyFire = window.location.hostname.includes('skyfirestudio.com');
const basePath = isGithubPages ? '/demo-offline-map/' : (isSkyFire ? '/maps/' : '/');


cacheAssets = [
    basePath,
    `${basePath}index.html`,
    `${basePath}libs/leaflet.css`,
    `${basePath}libs/leaflet.js`,
    `${basePath}images/marker-icon.png`,
    `${basePath}images/marker-shadow.png`,
    `${basePath}images/marker-icon-2x.png`
];
const cacheName = 'maptiler-raster-cache-v3';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(cacheAssets);
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.url.includes('https://api.maptiler.com/maps/streets-v2/')) {
        // Intercept requests to map tiles
        event.respondWith(
            caches.match(event.request).then(function(response) {
                if (response) {
                    // If the resource is found in the cache, return it
                    return response;
                }

                // If the tile is not found in the cache, request it from the network
                return fetch(event.request).then(function(networkResponse) {
                    // If the response is successful, add the tile to the cache
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(cacheName).then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(function() {
                    // In case of no network, return a fallback or notify the user
                    return new Response('Tile not found and no network access.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    } else {
        // Normal processing for other requests
        event.respondWith(
            caches.match(event.request).then(function(response) {
                return response || fetch(event.request);
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

