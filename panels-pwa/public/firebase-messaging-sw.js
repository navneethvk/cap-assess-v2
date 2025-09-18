/* eslint-disable no-undef */
// Firebase Messaging service worker for background notifications
// Uses compat layer because service worker cannot use ES modules directly.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// The app config must match the web app's config.
// These will be injected at build time if you prefer; for now, read from global placeholder.
// To avoid leaking secrets, values should come from public Firebase config (safe to expose).
const firebaseConfig = {
  apiKey: self?.ENV_VITE_FIREBASE_API_KEY || undefined,
  authDomain: self?.ENV_VITE_FIREBASE_AUTH_DOMAIN || undefined,
  projectId: self?.ENV_VITE_FIREBASE_PROJECT_ID || undefined,
  storageBucket: self?.ENV_VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: self?.ENV_VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: self?.ENV_VITE_FIREBASE_APP_ID || undefined,
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload?.notification || {};
    const notificationTitle = title || 'New notification';
    const notificationOptions = {
      body: body || '',
      icon: icon || '/pwa-192x192.png',
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('firebase-messaging-sw init error', e);
}

