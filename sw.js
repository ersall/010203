self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', (event) => {
  // ничего не кешируем - просто пропускаем
});
