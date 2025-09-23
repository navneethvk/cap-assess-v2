import useSWR from 'swr';
import { collection, getDocs, query, QueryConstraint, Query, where, orderBy, limit, limitToLast, startAt, startAfter, endAt, endBefore } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import type { FirestoreDocument, DocumentWithId, QueryCondition } from '../types/firestore';
import { getDocuments } from '../firebase/firestoreService';

interface UseFirestoreCollectionOptions {
  queryConstraints?: QueryConstraint[];
  conditions?: QueryCondition[];
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
}

const firestoreCollectionFetcher = async (path: string, constraints: QueryConstraint[] = []) => {
  if (!path || path.trim() === '') {
    throw new Error('Collection path cannot be empty')
  }
  
  let q: Query<DocumentData> = collection(db, path);
  if (constraints && constraints.length > 0) {
    q = query(q, ...constraints);
  }

  const snapshot = await getDocs(q);
  // Map the document ID to both 'id' and 'uid' for compatibility
  return snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
};

// Legacy fetcher for backward compatibility
const legacyFirestoreCollectionFetcher = async (path: string, constraints: QueryConstraint[] = []) => {
  return firestoreCollectionFetcher(path, constraints);
};

// Typed fetcher using the new firestoreService
const typedFirestoreCollectionFetcher = async <T extends FirestoreDocument>(
  path: string, 
  conditions?: QueryCondition[]
) => {
  return getDocuments<T>(path, conditions);
};

/**
 * Typed hook for Firestore collections
 * 
 * @param path - Collection path
 * @param options - Configuration options
 * @returns Typed collection data with loading states
 */
export const useFirestoreCollection = <T extends FirestoreDocument = FirestoreDocument>(
  path: string, 
  options?: UseFirestoreCollectionOptions
) => {
  const constraints = options?.queryConstraints || [];
  const conditions = options?.conditions;
  const key = constraints.length > 0 ? [path, JSON.stringify(constraints)] : path;

  // Use typed fetcher if conditions are provided, otherwise use legacy fetcher
  const fetcher = conditions 
    ? () => typedFirestoreCollectionFetcher<T>(path, conditions)
    : () => legacyFirestoreCollectionFetcher(path, constraints) as unknown as Promise<DocumentWithId<T>[]>;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateIfStale: options?.revalidateIfStale ?? false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Disable periodic refresh
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    data: data as DocumentWithId<T>[],
    isLoading,
    error,
    mutate, // Expose the mutate function
  };
};

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useFirestoreCollection<T> with proper typing instead
 */
export const useFirestoreCollectionLegacy = <T = DocumentData>(
  path: string, 
  options?: UseFirestoreCollectionOptions
) => {
  console.warn('useFirestoreCollectionLegacy is deprecated. Use useFirestoreCollection<T> instead.');
  return useFirestoreCollection<T extends FirestoreDocument ? T : FirestoreDocument>(path, options);
};
