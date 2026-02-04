/**
 * Service Worker para Claro Asesor
 * Implementa cache-first strategy para funcionalidad offline
 */

const CACHE_VERSION = '2026-02-04-a';
const CACHE_NAME = `claro-asesor-${CACHE_VERSION}`;
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './prices.json',
    './links.json',
    './js/constants.js',
    './js/utils.js',
    './js/storage.js',
    './js/calculator.js',
    './js/ui.js',
    './js/config.js',
    './js/pdf-export.js',
    './js/chart.js',
    './js/toast.js',
    './js/sw-register.js',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// Instalación: cachear archivos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando archivos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Eliminando cache antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch: cache-first, fallback to network
self.addEventListener('fetch', (event) => {
    // Solo manejar requests GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Retornar de cache, pero actualizar en background
                    fetchAndCache(event.request);
                    return cachedResponse;
                }

                // Si no está en cache, ir a la red
                return fetchAndCache(event.request);
            })
            .catch(() => {
                // Fallback para páginas HTML
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});

// Fetch y actualizar cache
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);

        // Solo cachear respuestas válidas
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Fetch fallido:', error);
        throw error;
    }
}
