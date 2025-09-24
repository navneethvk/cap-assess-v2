/**
 * Suppresses common Firestore network errors from browser console
 * These are browser-level network errors that can't be caught by JavaScript
 */

// Override console methods to filter Firestore errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

const isFirestoreError = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes('fetch failed loading') &&
    (lowerMessage.includes('firestore.googleapis.com') ||
     lowerMessage.includes('google.firestore.v1.firestore/listen') ||
     lowerMessage.includes('listen/chann'))
  );
};

// Override console.error
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (isFirestoreError(message)) {
    // Suppress Firestore fetch errors - they're handled by retry logic
    return;
  }
  originalConsoleError.apply(console, args);
};

// Override console.warn
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (isFirestoreError(message)) {
    // Suppress Firestore fetch warnings
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Override console.log for network-related logs
console.log = (...args: any[]) => {
  const message = args.join(' ');
  if (isFirestoreError(message)) {
    // Suppress Firestore fetch logs
    return;
  }
  originalConsoleLog.apply(console, args);
};

// Also override window.onerror to catch any remaining errors
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  const messageStr = String(message);
  if (isFirestoreError(messageStr)) {
    return true; // Suppress the error
  }
  
  if (originalOnError) {
    return originalOnError.call(this, message, source, lineno, colno, error);
  }
  
  return false;
};

export const restoreConsoleMethods = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  window.onerror = originalOnError;
};
