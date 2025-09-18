import useSWR from 'swr';
import { doc, getDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import useAuthStore from '../store/authStore';

interface UseUserDataOptions {
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const userDataFetcher = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const useUserData = <T = DocumentData>(userId: string, options?: UseUserDataOptions) => {
  const { user } = useAuthStore();
  
  const key = userId && user ? ['user', userId] : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => userDataFetcher(userId),
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateIfStale: options?.revalidateIfStale ?? false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable periodic refresh
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    data: data as T,
    isLoading,
    error,
    mutate, // Expose the mutate function
  };
};
