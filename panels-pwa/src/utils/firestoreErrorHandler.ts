/**
 * Utility functions for handling Firestore errors gracefully
 */

/**
 * Checks if an error is a common Firestore network/listener error that should be handled gracefully
 */
export const isFirestoreNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('fetch') || 
    message.includes('listen') ||
    message.includes('firestore') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('chann') // Common in Firestore listener URLs
  );
};

/**
 * Logs Firestore errors with appropriate level based on error type
 */
export const logFirestoreError = (context: string, error: unknown): void => {
  if (isFirestoreNetworkError(error)) {
    // Network errors are common and expected, log as warning
    console.warn(`Firestore network error in ${context}:`, error);
  } else {
    // Other errors are unexpected, log as error
    console.error(`Firestore error in ${context}:`, error);
  }
};

/**
 * Wraps a Firestore operation with error handling
 */
export const withFirestoreErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    logFirestoreError(context, error);
    return fallbackValue ?? null;
  }
};
