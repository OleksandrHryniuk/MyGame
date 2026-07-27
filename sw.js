// Service worker: caches the game shell + all assets so it works offline and can be
// installed as a PWA. Bump CACHE_NAME whenever any cached file changes so clients
// pick up the update (old caches are cleaned up in 'activate').
const CACHE_NAME = 'banana-hunter-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './mygame.js',
  './phaser.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/bground.png',
  './assets/banana_clear.png',
  './assets/banana_scin.png',
  './assets/player2.png',
  './assets/tilemap.csv',
  './assets/tileset.png',
  './assets/replay.png',
  './assets/play.png',
  './assets/info_button.png',
  './assets/info.png',
  './assets/pause.png',
  './assets/bgsound.mp3',
  './assets/jump.wav',
  './assets/Coin.wav',
  './assets/slip_off_fall.wav'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Cache-first: serve from cache when available, otherwise fetch and cache the result.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
