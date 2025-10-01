import { useState, useEffect, useCallback, useRef } from 'react';
import { sharedListenerCache } from '@/services/SharedListenerCache';
import type { VisitDoc } from '@/types/firestore';
import useAuthStore from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

/**
 * Shared Visit Queries Hook
 * 
 * This hook replaces the SWR-based approach with a shared listener cache
 * that provides real-time updates and intelligent caching with range-aware TTL.
 */

interface DateRange {
  start: Date;
  end: Date;
}

interface UseSharedVisitQueriesOptions {
  dateRange?: DateRange;
  userId?: string | null;
  forceRefresh?: boolean;
  onError?: (error: Error) => void;
}

interface UseSharedVisitQueriesResult {
  visits: VisitDoc[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Main hook for shared visit queries with real-time listeners
 */
export const useSharedVisitQueries = (options: UseSharedVisitQueriesOptions = {}): UseSharedVisitQueriesResult => {
  const { user } = useAuthStore();
  const { seeAllVisits } = usePreferencesStore();
  
  const [visits, setVisits] = useState<VisitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Generate unique component ID for this hook instance
  const componentIdRef = useRef(`shared-visits-${Math.random().toString(36).substr(2, 9)}`);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
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

  // Determine the effective date range
  const effectiveDateRange = useMemo(() => {
    if (options.dateRange) {
      return options.dateRange;
    }
    
    // Default to current month if no range specified
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return { start: startOfMonth, end: endOfMonth };
  }, [options.dateRange]);

  // Determine the effective user ID
  const effectiveUserId = useMemo(() => {
    if (options.userId !== undefined) {
      return options.userId;
    }
    return user?.uid || null;
  }, [options.userId, user?.uid]);

  // Subscribe to shared listener cache
  useEffect(() => {
    const componentId = componentIdRef.current;
    
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setLoading(true);
    setError(null);

    // Subscribe to the shared listener cache
    const unsubscribe = sharedListenerCache.subscribe(
      componentId,
      effectiveUserId,
      isAdmin,
      seeAllVisits,
      effectiveDateRange,
      (data: VisitDoc[]) => {
        setVisits(data);
        setLoading(false);
        setLastUpdated(new Date());
        setError(null);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
        if (options.onError) {
          options.onError(err);
        }
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [
    effectiveUserId,
    isAdmin,
    seeAllVisits,
    effectiveDateRange.start.getTime(),
    effectiveDateRange.end.getTime(),
    options.onError
  ]);

  // Refresh function
  const refresh = useCallback(() => {
    if (options.forceRefresh) {
      // Force refresh all listeners
      sharedListenerCache.refreshAll();
    }
  }, [options.forceRefresh]);

  return {
    visits,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

/**
 * Hook for visits in a specific date range (optimized for NotesView)
 */
export const useVisitsInRange = (
  startDate: Date,
  endDate: Date,
  options: Omit<UseSharedVisitQueriesOptions, 'dateRange'> = {}
): UseSharedVisitQueriesResult => {
  return useSharedVisitQueries({
    ...options,
    dateRange: { start: startDate, end: endDate }
  });
};

/**
 * Hook for visits for a specific date (optimized for timeline)
 */
export const useVisitsForDate = (
  date: Date,
  options: Omit<UseSharedVisitQueriesOptions, 'dateRange'> = {}
): UseSharedVisitQueriesResult => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return useVisitsInRange(startOfDay, endOfDay, options);
};

/**
 * Hook for all visits (admin only)
 */
export const useAllVisits = (
  options: Omit<UseSharedVisitQueriesOptions, 'dateRange'> = {}
): UseSharedVisitQueriesResult => {
  // Use a very wide date range for "all visits"
  const startDate = new Date('2020-01-01');
  const endDate = new Date('2030-12-31');
  
  return useVisitsInRange(startDate, endDate, options);
};

/**
 * Hook for user's own visits
 */
export const useUserVisits = (
  userId?: string,
  options: Omit<UseSharedVisitQueriesOptions, 'userId'> = {}
): UseSharedVisitQueriesResult => {
  return useSharedVisitQueries({
    ...options,
    userId: userId || null
  });
};

// Re-export types for convenience
export type { DateRange, UseSharedVisitQueriesOptions, UseSharedVisitQueriesResult };
