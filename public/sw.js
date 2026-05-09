self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now. 
  // You can add caching logic here for offline support later if needed.
  event.respondWith(fetch(event.request));
});
