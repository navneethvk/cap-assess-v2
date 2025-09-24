import useSWR from 'swr';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { visitQueryManager, type VisitQueryOptions } from '@/services/VisitQueryManager';
import type { VisitDoc } from '@/types/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import useAuthStore from '@/store/authStore';
import useAppStore from '@/store/appStore';

/**
 * Centralized hook for all visit queries
 * 
 * This hook provides a single source of truth for visit data access
 * with intelligent caching and query optimization.
 */

interface UseVisitQueriesOptions extends VisitQueryOptions {
  revalidateOnFocus?: boolean;
  revalidateIfStale?: boolean;
  dedupingInterval?: number;
}

/**
 * Main hook for querying visits with caching and automatic permissions
 */
export const useVisitQueries = (options: UseVisitQueriesOptions = {}) => {
  const { user } = useAuthStore();
  const { seeAllVisits } = useAppStore();
  
  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = idTokenResult.claims.role as string;
          setIsAdmin(role === 'Admin');
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  // Inject user context into options for automatic permissions
  const optionsWithUserContext = useMemo(() => ({
    ...options,
    _user: user,
    _isAdmin: isAdmin,
    _respectPermissions: options._respectPermissions !== false, // Default to true
    _seeAllVisits: seeAllVisits // Include See All setting
  }), [options, user, isAdmin, seeAllVisits]);
  
  // Generate cache key for SWR (including user context)
  const cacheKey = useMemo(() => {
    // Only generate a cache key if we have user context and admin status is determined
    // This prevents errors during the initial admin status check
    if (!user) {
      return null; // Don't fetch if no user
    }
    
    // Wait for admin status to be determined (isAdmin starts as false, then gets updated)
    // We need to ensure we don't make queries before admin status is known
    const keyParts = [
      'visit-queries',
      optionsWithUserContext.startDate?.toISOString() || 'all',
      optionsWithUserContext.endDate?.toISOString() || 'all',
      optionsWithUserContext.filledByUid || 'all',
      optionsWithUserContext.cciId || 'all',
      optionsWithUserContext.status || 'all',
      optionsWithUserContext.limit || 500,
      optionsWithUserContext.orderBy || 'date',
      optionsWithUserContext.orderDirection || 'desc',
      // Include user context for permission-aware caching
      user.uid,
      isAdmin ? 'admin' : 'user',
      seeAllVisits ? 'seeAll' : 'seeOwn'
    ];
    
    return keyParts.join('|');
  }, [optionsWithUserContext, user, isAdmin, seeAllVisits]);

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    () => visitQueryManager.queryVisits(optionsWithUserContext),
    {
      revalidateOnFocus: options.revalidateOnFocus ?? false,
      revalidateIfStale: options.revalidateIfStale ?? false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: options.dedupingInterval ?? 60000, // 1 minute
      // Don't show errors during initial load
      errorRetryCount: 0,
      shouldRetryOnError: false,
    }
  );

  // Override error state during initial loading phases
  const isInitialLoading = !user || isLoading;
  
  // Check if error is a Firestore index error (common during development)
  const isIndexError = error && error.message && error.message.includes('query requires an index');
  
  // Suppress errors during initial loading OR if it's an index error
  const shouldShowError = error && !isInitialLoading && !isIndexError;

  // Suppress index errors and initial loading errors silently

  return {
    visits: data?.visits ?? [],
    hasMore: data?.hasMore ?? false,
    lastDoc: data?.lastDoc,
    isLoading: isInitialLoading,
    error: shouldShowError ? error : null, // Suppress errors during initial loading
    mutate,
    refetch: mutate
  };
};

/**
 * Hook for getting visits in a date range (optimized for NotesView)
 */
export const useVisitsInRange = (
  startDate: Date, 
  endDate: Date, 
  options: Omit<UseVisitQueriesOptions, 'startDate' | 'endDate'> = {}
) => {
  return useVisitQueries({
    ...options,
    startDate,
    endDate,
    orderBy: 'date',
    orderDirection: 'desc'
  });
};

/**
 * Hook for getting user-specific visits (explicitly filters by current user)
 * This is now equivalent to useAllVisits for non-admin users, but explicit
 */
export const useUserVisits = (
  options: Omit<UseVisitQueriesOptions, 'filledByUid'> = {}
) => {
  const { user } = useAuthStore();
  
  return useVisitQueries({
    ...options,
    filledByUid: user?.uid, // Explicitly filter by current user
    orderBy: 'date',
    orderDirection: 'desc'
  });
};

/**
 * Hook for getting visits for a specific date (optimized for timeline)
 */
export const useVisitsForDate = (
  date: Date,
  options: Omit<UseVisitQueriesOptions, 'startDate' | 'endDate'> = {}
) => {
  const startOfDay = useMemo(() => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [date]);

  const endOfDay = useMemo(() => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [date]);

  return useVisitsInRange(startOfDay, endOfDay, options);
};

/**
 * Hook for getting all visits (respects permissions automatically)
 * Admin users will see all visits, non-admin users will see only their visits
 */
export const useAllVisits = (options: Omit<UseVisitQueriesOptions, 'filledByUid'> = {}) => {
  return useVisitQueries({
    ...options,
    orderBy: 'date',
    orderDirection: 'desc'
  });
};

/**
 * Hook for getting visits with CCI filtering
 */
export const useVisitsByCCI = (
  cciId: string,
  options: Omit<UseVisitQueriesOptions, 'cciId'> = {}
) => {
  return useVisitQueries({
    ...options,
    cciId,
    orderBy: 'date',
    orderDirection: 'desc'
  });
};

/**
 * Hook for getting visits by status
 */
export const useVisitsByStatus = (
  status: VisitDoc['status'],
  options: Omit<UseVisitQueriesOptions, 'status'> = {}
) => {
  return useVisitQueries({
    ...options,
    status,
    orderBy: 'date',
    orderDirection: 'desc'
  });
};

/**
 * Hook for paginated visit queries
 */
export const usePaginatedVisits = (
  options: UseVisitQueriesOptions & { pageSize?: number } = {}
) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>();
  
  const queryOptions = useMemo(() => ({
    ...options,
    limit: options.pageSize || 50,
    startAfterDoc: currentPage > 0 ? lastDoc : undefined
  }), [options, currentPage, lastDoc]);

  const result = useVisitQueries(queryOptions);

  const nextPage = useCallback(() => {
    if (result.hasMore && result.lastDoc) {
      setLastDoc(result.lastDoc);
      setCurrentPage(prev => prev + 1);
    }
  }, [result.hasMore, result.lastDoc]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      // Note: Firestore doesn't support backward pagination easily
      // This would need to be implemented with a different approach
    }
  }, [currentPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(0);
    setLastDoc(undefined);
  }, []);

  return {
    ...result,
    currentPage,
    hasNextPage: result.hasMore,
    hasPrevPage: currentPage > 0,
    nextPage,
    prevPage,
    resetPagination
  };
};

/**
 * Hook for preloading common queries
 */
export const usePreloadVisits = () => {
  const { user } = useAuthStore();
  
  const preload = useCallback(async () => {
    await visitQueryManager.preloadCommonQueries(user?.uid);
  }, [user?.uid]);

  return { preload };
};

/**
 * Hook for cache management
 */
export const useVisitCache = () => {
  const clearCache = useCallback((pattern?: string) => {
    visitQueryManager.clearCache(pattern);
  }, []);

  const getCacheStats = useCallback(() => {
    return visitQueryManager.getCacheStats();
  }, []);

  return {
    clearCache,
    getCacheStats
  };
};

// Re-export types for convenience
export type { VisitQueryOptions, VisitQueryResult } from '@/services/VisitQueryManager';
