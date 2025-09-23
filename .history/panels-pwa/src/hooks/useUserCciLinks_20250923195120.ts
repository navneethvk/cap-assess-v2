import useSWR from 'swr';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import useAuthStore from '../store/authStore';

interface UseUserCciLinksOptions {
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const userCciLinksFetcher = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'cci_user_links', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
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
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable periodic refresh
      dedupingInterval: 60000, // Cache for 1 minute
      // Don't show errors during initial load
      errorRetryCount: 0,
      shouldRetryOnError: false,
    }
  );

  // Suppress errors during initial loading when user is not available
  const shouldShowError = error && user && !isLoading;

  return {
    data: data as T,
    isLoading,
    error: null, // TEMPORARILY DISABLE ALL ERRORS
    mutate, // Expose the mutate function
  };
};
