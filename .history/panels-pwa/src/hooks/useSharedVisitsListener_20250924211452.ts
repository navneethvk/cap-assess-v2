import { useEffect, useRef, useState, useCallback } from 'react';
import { sharedListenerCache } from '@/services/SharedListenerCache';
import type { VisitDoc } from '@/types/firestore';
import { usePermissionsStore } from '@/store/permissionsStore';
import { usePreferencesStore } from '@/store/preferencesStore';

interface DateRange {
  start: Date;
  end: Date;
}

interface UseSharedVisitsListenerOptions {
  dateRange: DateRange;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseSharedVisitsListenerResult {
  data: VisitDoc[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for subscribing to visits data using the shared listener cache
 * 
 * This hook ensures that multiple components requesting the same date range
 * share a single Firestore listener, improving performance and reducing
 * unnecessary network requests.
 */
export const useSharedVisitsListener = ({
  dateRange,
  enabled = true,
  onError
}: UseSharedVisitsListenerOptions): UseSharedVisitsListenerResult => {
  const [data, setData] = useState<VisitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { userId, isAdmin } = usePermissionsStore();
  const { seeAllVisits } = usePreferencesStore();
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const componentIdRef = useRef<string>();
  
  // Generate unique component ID
  if (!componentIdRef.current) {
    componentIdRef.current = `component_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  
  // Handle data updates
  const handleDataUpdate = useCallback((newData: VisitDoc[]) => {
    setData(newData);
    setLoading(false);
    setError(null);
  }, []);
  
  // Handle errors
  const handleError = useCallback((err: Error) => {
    setError(err);
    setLoading(false);
    onError?.(err);
  }, [onError]);
  
  // Refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    sharedListenerCache.refreshAll();
  }, []);
  
  // Subscribe to shared listener cache
  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Unsubscribe from previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Subscribe to new listener
    unsubscribeRef.current = sharedListenerCache.subscribe(
      componentIdRef.current!,
      userId,
      isAdmin,
      seeAllVisits,
      dateRange,
      handleDataUpdate,
      handleError
    );
    
    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [
    enabled,
    userId,
    isAdmin,
    seeAllVisits,
    dateRange.start.getTime(),
    dateRange.end.getTime(),
    handleDataUpdate,
    handleError
  ]);
  
  return {
    data,
    loading,
    error,
    refresh
  };
};

/**
 * Hook for getting visits data for a specific date (single day)
 */
export const useSharedVisitsForDate = (
  date: Date,
  options?: Omit<UseSharedVisitsListenerOptions, 'dateRange'>
): UseSharedVisitsListenerResult => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return useSharedVisitsListener({
    dateRange: { start: startOfDay, end: endOfDay },
    ...options
  });
};

/**
 * Hook for getting visits data for the current week
 */
export const useSharedVisitsForWeek = (
  weekStart: Date,
  options?: Omit<UseSharedVisitsListenerOptions, 'dateRange'>
): UseSharedVisitsListenerResult => {
  const startOfWeek = new Date(weekStart);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return useSharedVisitsListener({
    dateRange: { start: startOfWeek, end: endOfWeek },
    ...options
  });
};

/**
 * Hook for getting visits data for the current month
 */
export const useSharedVisitsForMonth = (
  monthStart: Date,
  options?: Omit<UseSharedVisitsListenerOptions, 'dateRange'>
): UseSharedVisitsListenerResult => {
  const startOfMonth = new Date(monthStart);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(monthStart);
  endOfMonth.setMonth(monthStart.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return useSharedVisitsListener({
    dateRange: { start: startOfMonth, end: endOfMonth },
    ...options
  });
};
