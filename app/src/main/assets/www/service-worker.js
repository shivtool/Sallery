// service-worker.js - 100% Offline Capability for SALARY Powered by SHIV COMPUTER

const CACHE_NAME = 'salary-shiv-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/responsive.css',
  './css/print.css',
  './js/utils.js',
  './js/db.js',
  './js/auth.js',
  './js/audit.js',
  './js/schools.js',
  './js/employees.js',
  './js/attendance.js',
  './js/settings.js',
  './js/salary.js',
  './js/payslip.js',
  './js/reports.js',
  './js/backup.js',
  './js/app.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
