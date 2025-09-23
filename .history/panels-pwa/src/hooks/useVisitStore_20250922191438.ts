import { useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import useVisitStore, { createWindowKey } from '@/store/visitStore';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useUserVisits } from '@/hooks/useUserVisits';
import type { VisitDoc, DocumentWithId } from '@/types/firestore';
import { timestampToDate } from '@/types/firestore';

// Hook for components to interact with the central visit store
export const useVisitStore = () => {
  const { user } = useAuthStore();
  const store = useVisitStore();

  // Determine user role
  const isAdmin = useMemo(() => {
    return user?.getIdTokenResult?.()?.then(result => result.claims.role === 'Admin') || false;
  }, [user]);

  const isEM = useMemo(() => {
    return user?.getIdTokenResult?.()?.then(result => result.claims.role === 'EM') || false;
  }, [user]);

  // Set user role when it changes
  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then(result => {
        const role = result.claims.role as string;
        store.setUserRole(role === 'Admin', role === 'EM');
      });
    }
  }, [user, store]);

  // Initialize background loading when user is available
  useEffect(() => {
    if (user && !store.isBackgroundLoading) {
      store.startBackgroundLoading();
    }
  }, [user, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      store.stopBackgroundLoading();
    };
  }, [store]);

  // Get visits for a specific date range
  const getVisitsInRange = useCallback((startDate: Date, endDate: Date) => {
    return store.getVisitsInRange(startDate, endDate);
  }, [store]);

  // Get visits for a specific date
  const getVisitsForDate = useCallback((date: Date) => {
    return store.getVisitsForDate(date);
  }, [store]);

  // Load a specific window
  const loadWindow = useCallback(async (startDate: Date, endDate: Date, forceRefresh = false) => {
    const windowKey = createWindowKey(startDate, endDate);
    
    // Check if window already exists and is recent
    if (!forceRefresh && store.windows[windowKey] && store.windows[windowKey].lastFetched) {
      const timeSinceFetch = Date.now() - store.windows[windowKey].lastFetched!.getTime();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (timeSinceFetch < maxAge) {
        store.setActiveWindow(windowKey);
        return;
      }
    }

    // Set loading state
    store.setWindowLoading(windowKey, true);
    store.setWindowError(windowKey, null);
    store.setActiveWindow(windowKey);

    try {
      // Determine which data source to use based on user role
      let visits: DocumentWithId<VisitDoc>[] = [];

      if (store.isAdmin) {
        // Admin: fetch all visits and filter by date range
        const { data: allVisits } = useFirestoreCollection<VisitDoc>('visits');
        if (allVisits) {
          visits = allVisits.filter(visit => {
            const visitDate = timestampToDate(visit.date) || new Date();
            return visitDate >= startDate && visitDate <= endDate;
          });
        }
      } else {
        // Non-admin: fetch user-specific visits and filter by date range
        const { data: userVisits } = useUserVisits('visits');
        if (userVisits) {
          visits = userVisits.filter(visit => {
            const visitDate = timestampToDate(visit.date) || new Date();
            return visitDate >= startDate && visitDate <= endDate;
          });
        }
      }

      // Update window with loaded data
      store.setWindowData(windowKey, {
        startDate,
        endDate,
        visits,
        isLoading: false,
        error: null,
        lastFetched: new Date(),
      });

    } catch (error) {
      // Handle error
      store.setWindowData(windowKey, {
        startDate,
        endDate,
        visits: store.windows[windowKey]?.visits || [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load visits',
        lastFetched: null,
      });
    }
  }, [store]);

  // Expand current window
  const expandWindow = useCallback((direction: 'past' | 'future', days: number) => {
    return store.expandWindow(direction, days);
  }, [store]);

  // Get all visits (for admin users)
  const getAllVisits = useCallback(() => {
    if (!isAdmin) return [];
    
    const allVisits: DocumentWithId<VisitDoc>[] = [];
    Object.values(store.windows).forEach(window => {
      allVisits.push(...window.visits);
    });
    
    return allVisits;
  }, [isAdmin, store.windows]);

  // Get user's visits (for EM users)
  const getUserVisits = useCallback(() => {
    if (isAdmin) return getAllVisits();
    
    const userVisits: DocumentWithId<VisitDoc>[] = [];
    Object.values(store.windows).forEach(window => {
      window.visits.forEach(visit => {
        if (visit.filledByUid === user?.uid) {
          userVisits.push(visit);
        }
      });
    });
    
    return userVisits;
  }, [isAdmin, getAllVisits, store.windows, user?.uid]);

  // Check if a window is loading
  const isWindowLoading = useCallback((startDate: Date, endDate: Date) => {
    const windowKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    return store.windows[windowKey]?.isLoading || false;
  }, [store.windows]);

  // Get window error
  const getWindowError = useCallback((startDate: Date, endDate: Date) => {
    const windowKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    return store.windows[windowKey]?.error || null;
  }, [store.windows]);

  // Smart loading for timeline view
  const loadTimelineData = useCallback(async (centerDate: Date) => {
    const { isEM, expansionSettings } = store;
    const windowDays = isEM ? expansionSettings.emWindowDays : expansionSettings.defaultWindowDays;
    
    const startDate = new Date(centerDate);
    startDate.setDate(startDate.getDate() - windowDays);
    
    const endDate = new Date(centerDate);
    endDate.setDate(endDate.getDate() + windowDays);
    
    await loadWindow(startDate, endDate);
  }, [store, loadWindow]);

  // Smart loading for calendar view
  const loadCalendarData = useCallback(async (month: Date) => {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    await loadWindow(startDate, endDate);
  }, [loadWindow]);

  // Smart loading for notes view
  const loadNotesData = useCallback(async (startDate: Date, endDate: Date) => {
    await loadWindow(startDate, endDate);
  }, [loadWindow]);

  return {
    // Data
    visits: store.windows,
    isAdmin,
    isEM,
    isBackgroundLoading: store.isBackgroundLoading,
    
    // Actions
    getVisitsInRange,
    getVisitsForDate,
    loadWindow,
    expandWindow,
    getAllVisits,
    getUserVisits,
    loadTimelineData,
    loadCalendarData,
    loadNotesData,
    
    // Utilities
    isWindowLoading,
    getWindowError,
    clearWindow: store.clearWindow,
    clearAllWindows: store.clearAllWindows,
  };
};

export default useVisitStore;
