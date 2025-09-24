/**
 * Console filtering utilities to reduce noise from common Firestore errors
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

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

/**
 * Restore original console methods (for testing or debugging)
 */
export const restoreConsole = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};
