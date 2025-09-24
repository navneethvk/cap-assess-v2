import useSWR from 'swr';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import useAuthStore from '../store/authStore';
import { isFirestoreNetworkError, logFirestoreError } from '../utils/firestoreErrorHandler';

interface UseUserCciLinksOptions {
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const userCciLinksFetcher = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'cci_user_links', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    // Check if it's a Firestore listener timeout/fetch error
    const isFirestoreError = error instanceof Error && (
      error.message.includes('fetch') || 
      error.message.includes('Listen') ||
      error.message.includes('Firestore') ||
      error.message.includes('network')
    );
    
    if (isFirestoreError) {
      console.warn('Firestore fetch error in useUserCciLinks, will retry...', error);
      // Don't throw the error, let SWR handle retries
      return null;
    }
    
    // For other errors, throw them
    throw error;
  }
};

export const useUserCciLinks = <T = DocumentData>(userId: string, options?: UseUserCciLinksOptions) => {
  const { user } = useAuthStore();
  
  const key = userId && user ? ['cci_user_links', userId] : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => userCciLinksFetcher(userId),
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateIfStale: options?.revalidateIfStale ?? false,
      revalidateOnReconnect: true, // Allow reconnection retries
      refreshInterval: 0, // Disable periodic refresh
      dedupingInterval: 60000, // Cache for 1 minute
      // Allow retries for network errors
      errorRetryCount: 3,
      errorRetryInterval: 5000, // Retry every 5 seconds
      shouldRetryOnError: (error) => {
        // Only retry on Firestore network errors
        return error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('Listen') ||
          error.message.includes('Firestore') ||
          error.message.includes('network')
        );
      },
    }
  );

  // Suppress errors during initial loading when user is not available
  const shouldShowError = error && user && !isLoading;

  return {
    data: data as T,
    isLoading,
    error: shouldShowError ? error : null, // Suppress errors during initial loading
    mutate, // Expose the mutate function
  };
};
