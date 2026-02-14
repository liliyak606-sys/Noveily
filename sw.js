const CACHE_NAME = 'noveily-cache-v10';
const urlsToCache = [
  '/',
  'index.html',
  'index.tsx',
  'App.tsx',
  'types.ts',
  'utils/db.ts',
  'services/geminiService.ts',
  'components/Library.tsx',
  'components/Reader.tsx',
  'components/Uploader.tsx',
  'components/Editor.tsx',
  'components/CoverEditor.tsx',
  'components/SplashScreen.tsx',
  'components/Toast.tsx',
  'components/Logo.tsx',
  'components/LanguageSelectionScreen.tsx',
  'components/Onboarding.tsx',
  'contexts/LanguageContext.tsx',
  'locales/en.json',
  'locales/ru.json',
  'assets/icon.svg',
  'manifest.json',
  // esm.sh dependencies
  'https://esm.sh/@google/genai@^1.41.0',
  'https://esm.sh/uuid@^13.0.0',
  'https://esm.sh/react@^19.2.4',
  'https://esm.sh/react@^19.2.4/',
  'https://esm.sh/lucide-react@^0.564.0',
  'https://esm.sh/react-dom@^19.2.4/',
  'https://esm.sh/react-dom@^19.2.4/client',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
      return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(
          response => {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});