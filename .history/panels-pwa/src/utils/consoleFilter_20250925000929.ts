/**
 * Console filtering utilities to reduce noise from common Firestore errors
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Override browser's native error reporting for network errors
const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

// Store original fetch method
const originalFetch = window.fetch;

/**
 * Filters out common Firestore fetch/listener errors from console output
 */
const shouldFilterError = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Common Firestore fetch error patterns
  const firestoreErrorPatterns = [
    'fetch failed loading: get',
    'firestore.googleapis.com/google.firestore.v1.firestore/listen',
    'listen/chann',
    'firestore listen',
    'firestore fetch',
    'google.firestore.v1.firestore/listen',
    'firestore.googleapis.com',
    'listen/chann...rpc',
    'sid=',
    'aid=0',
    'type=xmlhttp'
  ];
  
  return firestoreErrorPatterns.some(pattern => lowerMessage.includes(pattern));
};

/**
 * Filtered console.error that suppresses common Firestore errors
 */
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  if (shouldFilterError(message)) {
    // Suppress common Firestore errors - they're handled by retry logic
    return;
  }
  
  // Log other errors normally
  originalConsoleError.apply(console, args);
};

/**
 * Filtered console.warn that suppresses common Firestore warnings
 */
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  if (shouldFilterError(message)) {
    // Suppress common Firestore warnings - they're handled by retry logic
    return;
  }
  
  // Log other warnings normally
  originalConsoleWarn.apply(console, args);
};

// Override window.onerror to filter Firestore network errors
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  const messageStr = String(message);
  
  if (shouldFilterError(messageStr)) {
    // Suppress Firestore network errors
    return true; // Prevent default error handling
  }
  
  // Call original error handler for other errors
  if (originalOnError) {
    return originalOnError.call(this, message, source, lineno, colno, error);
  }
  
  return false;
};

// Override window.addEventListener for error events
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (type === 'error' && typeof listener === 'function') {
    const wrappedListener = function(event) {
      // Check if it's a Firestore network error
      if (event.target && event.target.src && shouldFilterError(event.target.src)) {
        return; // Suppress the error
      }
      
      // Check if it's a fetch error
      if (event.type === 'error' && event.target && event.target.tagName === 'SCRIPT') {
        const src = event.target.src || '';
        if (shouldFilterError(src)) {
          return; // Suppress the error
        }
      }
      
      // Call original listener for other errors
      return listener.call(this, event);
    };
    
    return originalAddEventListener.call(this, type, wrappedListener, options);
  }
  
  return originalAddEventListener.call(this, type, listener, options);
};

/**
 * Restore original console methods (for testing or debugging)
 */
export const restoreConsole = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  window.onerror = originalOnError;
  EventTarget.prototype.addEventListener = originalAddEventListener;
};
