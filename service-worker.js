const GEOSYNC_CACHE = "geosync-field-pwa-pcm-v20260904h";
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./styles.css",
    "./app.js",
    "./data/catalog.json",
    "./data/geoview-catalog.json",
    "./data/geoview-catalog.js",
    "./data/geoview-operational.js",
    "./data/google-earth-geospatial.js",
    "./data/cronograma-pcm.js",
    "./vendor/leaflet/leaflet.js",
    "./vendor/leaflet/leaflet.css",
    "./vendor/chart.umd.min.js",
    "./vendor/jszip.min.js",
    "./vendor/fontawesome/css/all.min.css",
    "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
    "./vendor/fontawesome/webfonts/fa-regular-400.woff2",
    "./vendor/fontawesome/webfonts/fa-brands-400.woff2",
    "./assets/itaminas-logo-white.png",
    "./assets/itaminas-pattern.png",
    "./assets/itaminas-layout-bg.jpg",
    "./assets/geoview-site-overview.webp",
    "./assets/ESTRUTURAS-GEOTEC-google-earth.kml",
    "./assets/icons/icon-72.png",
    "./assets/icons/icon-96.png",
    "./assets/icons/icon-128.png",
    "./assets/icons/icon-144.png",
    "./assets/icons/icon-152.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-384.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/maskable-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(GEOSYNC_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith("geosync-field-pwa-") && key !== GEOSYNC_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const requestUrl = new URL(request.url);
    if (!["http:", "https:"].includes(requestUrl.protocol)) return;

    // Para dados dinâmicos e sinais de sincronização, usar NetworkFirst
    if (requestUrl.pathname.includes("/data/") || requestUrl.pathname.includes("sync-signal")) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(GEOSYNC_CACHE).then(cache => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    const responseClone = networkResponse.clone();
                    caches.open(GEOSYNC_CACHE).then(cache => cache.put("./index.html", responseClone));
                    return networkResponse;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(request)
                .then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }

                    const sameOrigin = requestUrl.origin === self.location.origin;
                    if (sameOrigin) {
                        const responseClone = networkResponse.clone();
                        caches.open(GEOSYNC_CACHE).then(cache => cache.put(request, responseClone));
                    }

                    return networkResponse;
                })
                .catch(() => {
                    if (request.mode === "navigate") {
                        return caches.match("./index.html");
                    }
                    return caches.match("./assets/icons/icon-192.png");
                });
        })
    );
});
