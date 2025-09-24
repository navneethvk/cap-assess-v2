// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Firestore to reduce verbose logging
// This helps reduce console noise from Firestore network operations
if (typeof window !== 'undefined') {
  // Disable verbose Firestore logging in production
  if (import.meta.env.PROD) {
    // Override console methods for Firestore operations
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      // Filter out common Firestore fetch errors
      if (message.includes('Fetch failed loading') && message.includes('firestore.googleapis.com')) {
        return; // Suppress these errors
      }
      originalConsoleError.apply(console, args);
    };
  }
}

// Enable IndexedDB persistence for offline support
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('Firestore persistence enabled successfully');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all features required for persistence
      console.warn('Firestore persistence failed: Browser not supported');
    } else {
      console.error('Firestore persistence failed:', err);
    }
  });
