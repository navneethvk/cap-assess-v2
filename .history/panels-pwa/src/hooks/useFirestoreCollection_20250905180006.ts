import useSWR from 'swr';
import { collection, getDocs, query, QueryConstraint, Query } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';

interface UseFirestoreCollectionOptions {
  queryConstraints?: QueryConstraint[];
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const firestoreCollectionFetcher = async (path: string, constraints: QueryConstraint[] = []) => {
  let q: Query<DocumentData> = collection(db, path);
  if (constraints && constraints.length > 0) {
    q = query(q, ...constraints);
  }

  const snapshot = await getDocs(q);
  // Map the document ID to both 'id' and 'uid' for compatibility
  return snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
};

export const useFirestoreCollection = <T = DocumentData>(path: string, options?: UseFirestoreCollectionOptions) => {
  const key = options?.queryConstraints ? [path, JSON.stringify(options.queryConstraints)] : path;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => firestoreCollectionFetcher(path, options?.queryConstraints),
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
