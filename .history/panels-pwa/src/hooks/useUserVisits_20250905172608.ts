import useSWR from 'swr';
import { collection, getDocs, query, where, QueryConstraint } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import useAuthStore from '../store/authStore';

interface UseUserVisitsOptions {
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const userVisitsFetcher = async (path: string, userId: string, constraints: QueryConstraint[] = []) => {
  // Create a query that filters visits by the current user's UID
  const baseQuery = query(collection(db, path), where('filledByUid', '==', userId));
  
  // Apply additional constraints if provided
  let q = baseQuery;
  if (constraints.length > 0) {
    q = query(baseQuery, ...constraints);
  }

  const snapshot = await getDocs(q);
  // Map the document ID to both 'id' and 'uid' for compatibility
  return snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
};

export const useUserVisits = <T = DocumentData>(path: string, options?: UseUserVisitsOptions) => {
  const { user } = useAuthStore();
  
  const key = user ? [path, user.uid, 'userVisits'] : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => userVisitsFetcher(path, user!.uid, []),
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateIfStale: options?.revalidateIfStale ?? false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable periodic refresh
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    data: data as T[],
    isLoading,
    error,
    mutate, // Expose the mutate function
  };
};
