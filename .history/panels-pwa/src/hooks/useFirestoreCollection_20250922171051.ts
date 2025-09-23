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

// Encoded constraint for cache key generation
interface EncodedConstraint {
  type: string;
  field?: string;
  operator?: string;
  value?: any;
  direction?: string;
  count?: number;
}

/**
 * Encodes Firebase QueryConstraint objects into a serializable format for cache keys
 * This prevents cache collisions when different queries stringify to the same value
 */
const encodeQueryConstraints = (constraints: QueryConstraint[]): EncodedConstraint[] => {
  return constraints.map(constraint => {
    // Use the constraint's type property to determine the operation
    const constraintType = constraint.type;
    
    switch (constraintType) {
      case 'where':
        return {
          type: 'where',
          field: (constraint as any).field,
          operator: (constraint as any).op,
          value: (constraint as any).value
        };
      case 'orderBy':
        return {
          type: 'orderBy',
          field: (constraint as any).field,
          direction: (constraint as any).dir
        };
      case 'limit':
        return {
          type: 'limit',
          count: (constraint as any).limit
        };
      case 'limitToLast':
        return {
          type: 'limitToLast',
          count: (constraint as any).limit
        };
      case 'startAt':
        return {
          type: 'startAt',
          value: (constraint as any).values
        };
      case 'startAfter':
        return {
          type: 'startAfter',
          value: (constraint as any).values
        };
      case 'endAt':
        return {
          type: 'endAt',
          value: (constraint as any).values
        };
      case 'endBefore':
        return {
          type: 'endBefore',
          value: (constraint as any).values
        };
      default:
        // Fallback for unknown constraint types
        return {
          type: constraintType || 'unknown',
          value: constraint
        };
    }
  });
};

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
  
  // Generate a proper cache key that encodes constraints manually
  let key: string | [string, string];
  if (constraints.length > 0) {
    const encodedConstraints = encodeQueryConstraints(constraints);
    key = [path, JSON.stringify(encodedConstraints)];
  } else if (conditions && conditions.length > 0) {
    // For typed queries with conditions, encode the conditions
    key = [path, JSON.stringify(conditions)];
  } else {
    key = path;
  }

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
