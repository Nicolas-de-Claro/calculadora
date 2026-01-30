/**
 * Service Worker Registration
 * External script to comply with CSP
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('SW registrado:', reg.scope))
            .catch(err => console.log('SW error:', err));
    });
}
